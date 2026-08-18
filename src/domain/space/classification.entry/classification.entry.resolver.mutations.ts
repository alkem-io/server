import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { IClassificationEntry } from './classification.entry.interface';
import { ClassificationEntryService } from './classification.entry.service';
import { AddClassificationEntryFromTemplateInput } from './dto/classification.entry.dto.add.from.template';
import { CreateClassificationEntryInput } from './dto/classification.entry.dto.create';
import { DeleteClassificationEntryInput } from './dto/classification.entry.dto.delete';
import { UpdateClassificationEntryInput } from './dto/classification.entry.dto.update';
import { UpdateClassificationEntryDisplayInput } from './dto/classification.entry.dto.update.display';
import { UpdateClassificationEntrySelectionInput } from './dto/classification.entry.dto.update.selection';

// All six mutations gate on AuthorizationPrivilege.UPDATE against the OWNING
// SpaceAbout's existing policy — i.e. exactly the Space's existing edit
// rights (S-20, FR-014a). No new privilege and no new authorization_policy
// rows: entries carry no policy of their own (operator ruling D1).
@InstrumentResolver()
@Resolver()
export class ClassificationEntryResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private classificationEntryService: ClassificationEntryService,
    private spaceLookupService: SpaceLookupService
  ) {}

  @Mutation(() => IClassificationEntry, {
    description:
      'Adds a Classification to a Space by copying a Classification Template (Step A).',
  })
  @Profiling.api
  async addClassificationEntryFromTemplate(
    @CurrentActor() actorContext: ActorContext,
    @Args('classificationData')
    classificationData: AddClassificationEntryFromTemplateInput
  ): Promise<IClassificationEntry> {
    // The Space lookup IS the host-scope enforcement (D1, S-22): a Callout's
    // or a TemplateContentSpace's id fails here as "not a Space", never as a
    // privilege failure.
    const space = await this.spaceLookupService.getSpaceOrFail(
      classificationData.spaceID,
      { relations: { about: { authorization: true } } }
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      space.about.authorization,
      AuthorizationPrivilege.UPDATE,
      `addClassificationEntryFromTemplate: ${space.about.id}`
    );

    // The DESTINATION's UPDATE right is not authorization to read an
    // arbitrary SOURCE template's vocabulary — a Classification Template
    // can live inside a private Space's own library. Resolve and
    // READ-authorize it before ever copying from it.
    const template =
      await this.classificationEntryService.getClassificationTemplateOrFail(
        classificationData.templateID
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      template.authorization,
      AuthorizationPrivilege.READ,
      `addClassificationEntryFromTemplate source template: ${template.id}`
    );

    return this.classificationEntryService.addFromTemplate(
      space.about,
      template,
      classificationData.displayLabel
    );
  }

  @Mutation(() => IClassificationEntry, {
    description:
      'Creates a Classification on a Space ad hoc, without a Template (API-only).',
  })
  @Profiling.api
  async createClassificationEntry(
    @CurrentActor() actorContext: ActorContext,
    @Args('classificationData')
    classificationData: CreateClassificationEntryInput
  ): Promise<IClassificationEntry> {
    const space = await this.spaceLookupService.getSpaceOrFail(
      classificationData.spaceID,
      { relations: { about: { authorization: true } } }
    );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      space.about.authorization,
      AuthorizationPrivilege.UPDATE,
      `createClassificationEntry: ${space.about.id}`
    );

    return this.classificationEntryService.createAdHoc(
      space.about,
      classificationData
    );
  }

  @Mutation(() => IClassificationEntry, {
    description: 'Replaces the selected values of a Classification (Step B).',
  })
  @Profiling.api
  async updateClassificationEntrySelection(
    @CurrentActor() actorContext: ActorContext,
    @Args('classificationData')
    classificationData: UpdateClassificationEntrySelectionInput
  ): Promise<IClassificationEntry> {
    const entry =
      await this.classificationEntryService.getClassificationEntryOrFail(
        classificationData.classificationEntryID,
        { relations: { spaceAbout: { authorization: true } } }
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      entry.spaceAbout?.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateClassificationEntrySelection: ${entry.id}`
    );

    return this.classificationEntryService.updateSelection(
      entry,
      classificationData.selectedValueIDs
    );
  }

  @Mutation(() => IClassificationEntry, {
    description:
      "Updates a Classification's definition — label, cardinality and/or value set (API-only).",
  })
  @Profiling.api
  async updateClassificationEntry(
    @CurrentActor() actorContext: ActorContext,
    @Args('classificationData')
    classificationData: UpdateClassificationEntryInput
  ): Promise<IClassificationEntry> {
    const entry =
      await this.classificationEntryService.getClassificationEntryOrFail(
        classificationData.classificationEntryID,
        { relations: { spaceAbout: { authorization: true } } }
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      entry.spaceAbout?.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateClassificationEntry: ${entry.id}`
    );

    return this.classificationEntryService.updateDefinition(
      entry,
      classificationData
    );
  }

  @Mutation(() => IClassificationEntry, {
    description:
      "Toggles a Classification's shown/hidden state on the Space's About page.",
  })
  @Profiling.api
  async updateClassificationEntryDisplay(
    @CurrentActor() actorContext: ActorContext,
    @Args('classificationData')
    classificationData: UpdateClassificationEntryDisplayInput
  ): Promise<IClassificationEntry> {
    const entry =
      await this.classificationEntryService.getClassificationEntryOrFail(
        classificationData.classificationEntryID,
        { relations: { spaceAbout: { authorization: true } } }
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      entry.spaceAbout?.authorization,
      AuthorizationPrivilege.UPDATE,
      `updateClassificationEntryDisplay: ${entry.id}`
    );

    return this.classificationEntryService.updateDisplay(
      entry,
      classificationData.display
    );
  }

  @Mutation(() => IClassificationEntry, {
    description:
      'Permanently removes a Classification from a Space. No template and no other Space is affected.',
  })
  @Profiling.api
  async deleteClassificationEntry(
    @CurrentActor() actorContext: ActorContext,
    @Args('classificationData')
    classificationData: DeleteClassificationEntryInput
  ): Promise<IClassificationEntry> {
    const entry =
      await this.classificationEntryService.getClassificationEntryOrFail(
        classificationData.ID,
        { relations: { spaceAbout: { authorization: true } } }
      );
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      entry.spaceAbout?.authorization,
      AuthorizationPrivilege.UPDATE,
      `deleteClassificationEntry: ${entry.id}`
    );

    return this.classificationEntryService.delete(entry);
  }
}
