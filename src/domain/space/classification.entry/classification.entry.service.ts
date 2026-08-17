import { LogContext } from '@common/enums/logging.context';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import {
  DerivedClassificationValue,
  deriveClassificationValueIds,
} from '@domain/common/classification-value/slugify.value.id';
import { SpaceAbout } from '@domain/space/space.about/space.about.entity';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { Template } from '@domain/template/template/template.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ClassificationEntry } from './classification.entry.entity';
import { IClassificationEntry } from './classification.entry.interface';
import { ClassificationEntryValidator } from './classification.entry.validator';
import { CreateClassificationEntryInput } from './dto/classification.entry.dto.create';
import { UpdateClassificationEntryInput } from './dto/classification.entry.dto.update';

@Injectable()
export class ClassificationEntryService {
  constructor(
    @InjectRepository(ClassificationEntry)
    private classificationEntryRepository: Repository<ClassificationEntry>,
    // Narrow, direct read of the Template row (id, eager profile,
    // classificationCardinality, classificationValueSet) for Step A. NOT the
    // full TemplateModule/TemplateService: importing it here would close a
    // module cycle (SpaceAboutModule -> ClassificationEntryModule ->
    // TemplateModule -> TemplateContentSpaceModule -> SpaceAboutModule).
    // Mirrors the narrow @InjectRepository(Space) precedent in
    // bootstrap.service.ts for the same reason — a read-only cross-module
    // lookup that does not warrant the heavier module's full dependency graph.
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getClassificationEntryOrFail(
    classificationEntryID: string,
    options?: FindOneOptions<ClassificationEntry>
  ): Promise<IClassificationEntry> {
    const entry = await this.classificationEntryRepository.findOne({
      where: { id: classificationEntryID },
      ...options,
    });
    if (!entry) {
      throw new EntityNotFoundException(
        'Unable to find ClassificationEntry with the specified ID',
        LogContext.CLASSIFICATION,
        { classificationEntryID }
      );
    }
    return entry;
  }

  // The canonical read path: about.classifications[]. Council operator:Q6's
  // surviving intent — [] for an About with zero entries, never a throw.
  async getClassificationsForSpaceAbout(
    spaceAboutID: string
  ): Promise<IClassificationEntry[]> {
    return this.classificationEntryRepository.find({
      where: { spaceAbout: { id: spaceAboutID } },
      order: { sortOrder: 'ASC' },
    });
  }

  // Step A. `spaceAbout` is resolved (and authorized) by the caller via
  // SpaceLookupService.getSpaceOrFail(spaceID) — a Callout's or a
  // TemplateContentSpace's id fails there as "not a Space", which IS the
  // host-scope enforcement at this single creation point (D1, S-22).
  async addFromTemplate(
    spaceAbout: ISpaceAbout,
    templateID: string,
    displayLabelOverride?: string
  ): Promise<IClassificationEntry> {
    const template = await this.templateRepository.findOne({
      where: { id: templateID },
      relations: { profile: true },
    });
    if (!template) {
      throw new EntityNotFoundException(
        'Unable to find Template with the specified ID',
        LogContext.CLASSIFICATION,
        { templateID }
      );
    }
    const templateCardinality = template.classificationCardinality;
    const templateValueSet = template.classificationValueSet;
    if (
      template.type !== TemplateType.CLASSIFICATION ||
      !templateCardinality ||
      !templateValueSet
    ) {
      throw new ValidationException(
        'Template is not a fully-defined Classification Template',
        LogContext.CLASSIFICATION,
        { templateID, templateType: template.type }
      );
    }

    // Read once, at add time — never referenced again. Nothing about the
    // resulting entry can be resolved back to it (SC-003).
    const displayLabel = displayLabelOverride ?? template.profile.displayName;
    // Order + ids copied verbatim (S-9, S-10) — a structural clone, not a
    // re-derivation.
    const valueSet = deepCloneValueSet(templateValueSet);

    ClassificationEntryValidator.validateValueSet(valueSet);
    await this.assertDisplayLabelAvailable(spaceAbout.id, displayLabel);

    const entry = new ClassificationEntry();
    entry.spaceAbout = spaceAbout as SpaceAbout;
    entry.displayLabel = displayLabel;
    entry.cardinality = templateCardinality;
    entry.valueSet = valueSet;
    entry.selectedValueIDs = [];
    entry.display = true;
    entry.sortOrder = await this.nextSortOrder(spaceAbout.id);

    return this.classificationEntryRepository.save(entry);
  }

  // Ad-hoc (template-free) create — API-only this iteration (D4). Keyed on
  // spaceID exactly like addFromTemplate (C-8); `spaceAbout` is resolved and
  // authorized by the caller the same way.
  async createAdHoc(
    spaceAbout: ISpaceAbout,
    input: CreateClassificationEntryInput
  ): Promise<IClassificationEntry> {
    const derived: DerivedClassificationValue[] = deriveClassificationValueIds(
      input.values
    );
    ClassificationEntryValidator.validateValueSet(derived);
    await this.assertDisplayLabelAvailable(spaceAbout.id, input.displayLabel);

    const selectedValueIDs = input.selectedValueIDs ?? [];
    // FR-017a: Step A and Step B in one call — validated in the SAME atomic
    // pass as the value set, so an unknown id or a SINGLE_SELECT with >1
    // selected rejects the whole create with nothing persisted.
    ClassificationEntryValidator.validateSelection(
      input.cardinality,
      derived,
      selectedValueIDs
    );

    const entry = new ClassificationEntry();
    entry.spaceAbout = spaceAbout as SpaceAbout;
    entry.displayLabel = input.displayLabel;
    entry.cardinality = input.cardinality;
    entry.valueSet = derived;
    entry.selectedValueIDs = selectedValueIDs;
    entry.display = true;
    entry.sortOrder = await this.nextSortOrder(spaceAbout.id);

    return this.classificationEntryRepository.save(entry);
  }

  // Step B — full replacement, idempotent, atomic (S-2). `entry` must have
  // been loaded with its full valueSet/cardinality by the caller.
  async updateSelection(
    entry: IClassificationEntry,
    selectedValueIDs: string[]
  ): Promise<IClassificationEntry> {
    ClassificationEntryValidator.validateSelection(
      entry.cardinality,
      entry.valueSet,
      selectedValueIDs
    );
    entry.selectedValueIDs = selectedValueIDs;
    return this.classificationEntryRepository.save(
      entry as ClassificationEntry
    );
  }

  // Definition edit — API-only this iteration (D4). Every candidate is
  // computed and validated BEFORE any field is assigned onto `entry`, so a
  // rejection leaves it wholly unchanged (S-5).
  async updateDefinition(
    entry: IClassificationEntry,
    input: UpdateClassificationEntryInput
  ): Promise<IClassificationEntry> {
    const nextDisplayLabel = input.displayLabel ?? entry.displayLabel;
    const nextCardinality = input.cardinality ?? entry.cardinality;
    const nextValueSet = input.values
      ? deriveClassificationValueIds(input.values)
      : entry.valueSet;

    if (input.values) {
      ClassificationEntryValidator.validateValueSet(nextValueSet);
    }
    if (input.displayLabel) {
      await this.assertDisplayLabelAvailable(
        entry.spaceAbout!.id,
        nextDisplayLabel,
        entry.id
      );
    }

    // I-7 — auto-deselect any value the edit removed. Unambiguous, never
    // rejected. Must run BEFORE the I-4 narrowing check below, since a
    // removal can itself bring the count within bounds.
    const autoDeselected =
      ClassificationEntryValidator.autoDeselectRemovedValues(
        entry.selectedValueIDs,
        nextValueSet
      );

    // I-4 — narrowing cardinality while >1 remains selected is rejected
    // atomically; the server never picks a survivor (contrast I-7).
    ClassificationEntryValidator.validateSelection(
      nextCardinality,
      nextValueSet,
      autoDeselected
    );

    entry.displayLabel = nextDisplayLabel;
    entry.cardinality = nextCardinality;
    entry.valueSet = nextValueSet;
    entry.selectedValueIDs = autoDeselected;

    return this.classificationEntryRepository.save(
      entry as ClassificationEntry
    );
  }

  async updateDisplay(
    entry: IClassificationEntry,
    display: boolean
  ): Promise<IClassificationEntry> {
    entry.display = display;
    return this.classificationEntryRepository.save(
      entry as ClassificationEntry
    );
  }

  // Permanent — no soft-delete, no undo (S-16, FR-14b). Touches no template
  // and no other Space's entry: it is one row, with nothing pointing at it.
  async delete(entry: IClassificationEntry): Promise<IClassificationEntry> {
    const entryId = entry.id;
    const removed = await this.classificationEntryRepository.remove(
      entry as ClassificationEntry
    );
    removed.id = entryId;
    return removed;
  }

  async save(entry: IClassificationEntry): Promise<IClassificationEntry> {
    return this.classificationEntryRepository.save(
      entry as ClassificationEntry
    );
  }

  // I-8 — sortOrder := max(sibling sortOrder on this About) + 1. A re-added
  // entry lands last (FR-018b).
  private async nextSortOrder(spaceAboutID: string): Promise<number> {
    const row = await this.classificationEntryRepository
      .createQueryBuilder('entry')
      .select('MAX(entry.sortOrder)', 'max')
      .where('entry."spaceAboutId" = :spaceAboutID', { spaceAboutID })
      .getRawOne<{ max: number | null }>();
    return (row?.max ?? 0) + 1;
  }

  // I-5 — display label uniqueness among the SAME SpaceAbout's other
  // entries, under FR-011c normalization.
  private async assertDisplayLabelAvailable(
    spaceAboutID: string,
    candidateLabel: string,
    excludeEntryID?: string
  ): Promise<void> {
    const siblings = await this.classificationEntryRepository.find({
      where: { spaceAbout: { id: spaceAboutID } },
      select: { id: true, displayLabel: true },
    });
    ClassificationEntryValidator.validateDisplayLabelUnique(
      candidateLabel,
      siblings,
      excludeEntryID
    );
  }
}

// Structural clone of a template's value set into a snapshot — order + ids
// verbatim (S-9, S-10), no shared references back to the template row.
function deepCloneValueSet(
  valueSet: { id: string; label: string }[]
): DerivedClassificationValue[] {
  return valueSet.map(value => ({ id: value.id, label: value.label }));
}
