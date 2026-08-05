import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Classification } from '@domain/common/classification/classification.entity';
import { IClassification } from '@domain/common/classification/classification.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { CreateTagsetInput } from '../tagset';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { CreateClassificationInput } from './dto/classification.dto.create';
import { UpdateClassificationInput } from './dto/classification.dto.update';
import { UpdateClassificationSelectTagsetValueInput } from './dto/classification.dto.update.select.tagset.value';

@Injectable()
export class ClassificationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    @InjectRepository(Classification)
    private classificationRepository: Repository<Classification>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createClassification(
    tagsetTemplates: ITagsetTemplate[],
    classificationData?: CreateClassificationInput
  ): IClassification {
    const classification: IClassification = Classification.create();
    classification.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CLASSIFICATION
    );
    classification.tagsets = [];

    let tagsetsData =
      this.tagsetService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );
    if (classificationData) {
      const classificationTagsets = classificationData.tagsets.map(tagset => ({
        ...tagset,
        name: Object.keys(TagsetReservedName).includes(tagset.name)
          ? TagsetReservedName[tagset.name as keyof typeof TagsetReservedName]
          : tagset.name,
      }));

      // Ensure any supplied values in tags are used
      tagsetsData = this.tagsetService.updatedTagsetInputUsingProvidedData(
        tagsetsData,
        classificationTagsets
      );
    }
    classification.tagsets = tagsetsData.map(tagsetData =>
      this.tagsetService.createTagsetWithName([], tagsetData)
    );

    return classification;
  }

  async deleteClassification(
    classificationID: string
  ): Promise<IClassification> {
    // Note need to load it in with all contained entities so can remove fully
    const classification = await this.getClassificationOrFail(
      classificationID,
      {
        relations: {
          tagsets: true,
          authorization: true,
        },
      }
    );

    if (!classification.tagsets || !classification.authorization) {
      throw new EntityNotInitializedException(
        `Classification not initialized: ${classification.id}`,
        LogContext.CLASSIFICATION
      );
    }

    for (const tagset of classification.tagsets) {
      await this.tagsetService.removeTagset(tagset.id);
    }

    await this.authorizationPolicyService.delete(classification.authorization);

    return await this.classificationRepository.remove(
      classification as Classification
    );
  }

  public async save(classification: IClassification): Promise<IClassification> {
    return await this.classificationRepository.save(classification);
  }

  public async addTagsetOnClassification(
    classification: IClassification,
    tagsetData: CreateTagsetInput,
    mgr?: EntityManager
  ): Promise<ITagset> {
    if (!classification.tagsets) {
      classification.tagsets = await this.getTagsets(classification.id);
    }

    const tagset = this.tagsetService.createTagsetWithName(
      classification.tagsets,
      tagsetData
    );
    tagset.classification = classification;
    return await this.tagsetService.save(tagset, mgr);
  }

  async getClassificationOrFail(
    classificationID: string,
    options?: FindOneOptions<Classification>
  ): Promise<IClassification | never> {
    const classification = await Classification.findOne({
      ...options,
      where: { ...options?.where, id: classificationID },
    });
    if (!classification)
      throw new EntityNotFoundException(
        `Classification with id(${classificationID}) not found!`,
        LogContext.CLASSIFICATION
      );
    return classification;
  }

  async getTagsets(classificationID: string): Promise<ITagset[]> {
    const classification = await this.getClassificationOrFail(
      classificationID,
      {
        relations: { tagsets: true },
      }
    );
    if (!classification.tagsets) {
      throw new EntityNotInitializedException(
        `Classification not initialized: ${classification.id}`,
        LogContext.CLASSIFICATION
      );
    }
    return classification.tagsets;
  }

  private async getTagset(
    classificationID: string,
    tagsetName: string
  ): Promise<ITagset> {
    const tagsets = await this.getTagsets(classificationID);
    return this.tagsetService.getTagsetByNameOrFail(tagsets, tagsetName);
  }

  public updateClassification(
    classification: IClassification,
    updateData: UpdateClassificationInput
  ): IClassification {
    if (updateData.tagsets) {
      const classificationTagsets = updateData.tagsets.map(tagset => ({
        ...tagset,
        name: Object.keys(TagsetReservedName).includes(tagset.name ?? '')
          ? TagsetReservedName[tagset.name as keyof typeof TagsetReservedName]
          : tagset.name,
      }));
      classification.tagsets = this.tagsetService.updateTagsets(
        classification.tagsets,
        classificationTagsets
      );
    }
    return classification;
  }

  async updateSelectTagsetValue(
    updateData: UpdateClassificationSelectTagsetValueInput
  ): Promise<ITagset> {
    const tagset = await this.getTagset(
      updateData.classificationID,
      updateData.tagsetName
    );
    return await this.tagsetService.updateTagset({
      ID: tagset.id,
      tags: [updateData.selectedValue],
    });
  }

  async updateTagsetTemplateOnSelectTagset(
    classificationID: string,
    tagsetTemplate: ITagsetTemplate,
    mgr?: EntityManager
  ): Promise<ITagset> {
    const tagsets = await this.getTagsets(classificationID);
    const existingTagset = this.tagsetService.getTagsetByName(
      tagsets,
      tagsetTemplate.name
    );

    const defaultTags = this.resolveDefaultTags(tagsetTemplate);

    if (existingTagset) {
      existingTagset.tagsetTemplate = tagsetTemplate;
      // Preserve current value when it is still valid in the target template;
      // only fall back to the default when the current value is not allowed.
      const currentValue = existingTagset.tags?.[0];
      const isCurrentValueValid =
        currentValue != null &&
        currentValue !== '' &&
        tagsetTemplate.allowedValues?.includes(currentValue);
      existingTagset.tags = isCurrentValueValid ? [currentValue] : defaultTags;
      return await this.tagsetService.save(existingTagset, mgr);
    }

    // Target callouts set has a template not present in the source classification;
    // create a new tagset for it
    const classification = await this.getClassificationOrFail(classificationID);
    return await this.addTagsetOnClassification(
      classification,
      {
        name: tagsetTemplate.name,
        type: tagsetTemplate.type,
        tags: defaultTags,
        tagsetTemplate,
      },
      mgr
    );
  }

  /**
   * Resolves the value a SELECT_ONE tagset must fall back to when its current
   * value has no match in the target TagsetTemplate.
   *
   * `defaultSelectedValue` is only usable when it is itself one of the
   * template's `allowedValues`. It is a nullable column, and
   * `TagsetTemplateService.updateTagsetTemplateDefinition` only overwrites it
   * when the update carries a truthy value — so a template whose allowedValues
   * were replaced can be left pointing at a value that no longer exists, and
   * older templates may carry no default at all.
   *
   * Trusting it blindly leaves the tagset holding a value the target does not
   * know about (or, worse, no value at all). For a Callout's `flow-state`
   * classification that means it matches none of the destination's phases, so
   * after a cross-space transfer the Callout is filtered out of every tab and
   * appears to have vanished (story #6021, and the same root cause as #4970).
   *
   * The first allowed value is the destination's default state — the same
   * convention used by `CalloutsSetService.moveCalloutsToDefaultFlowState` and
   * by the flow-state template bootstrap in `CollaborationService`.
   *
   * Empty strings are discarded: a `simple-array` column persisted from an
   * empty array reads back as `['']`, which is not a selectable value.
   */
  private resolveDefaultTags(tagsetTemplate: ITagsetTemplate): string[] {
    const allowedValues = (tagsetTemplate.allowedValues ?? []).filter(
      allowedValue => allowedValue !== ''
    );
    const defaultSelectedValue = tagsetTemplate.defaultSelectedValue;

    if (allowedValues.length === 0) {
      // Nothing to validate against (e.g. a free-form template): keep whatever
      // default the template declares.
      return defaultSelectedValue ? [defaultSelectedValue] : [];
    }

    if (defaultSelectedValue && allowedValues.includes(defaultSelectedValue)) {
      return [defaultSelectedValue];
    }

    return [allowedValues[0]];
  }

  // Note: provided data has priority when it comes to tags
  public updateClassificationTagsetInputs(
    tagsetInputData: CreateTagsetInput[] | undefined,
    additionalTagsetInputs: CreateTagsetInput[]
  ): CreateTagsetInput[] {
    const result: CreateTagsetInput[] = [...additionalTagsetInputs];

    if (!tagsetInputData) return result;

    for (const tagsetInput of tagsetInputData) {
      const existingInput = result.find(t => t.name === tagsetInput.name);
      if (existingInput) {
        // Do not change type, name etc - only tags
        if (tagsetInput.tags) {
          existingInput.tags = tagsetInput.tags;
        }
      } else {
        result.push(tagsetInput);
      }
    }
    return result;
  }
}
