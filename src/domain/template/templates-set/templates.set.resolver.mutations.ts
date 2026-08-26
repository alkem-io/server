import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ContributionDefaultSourceInput } from '@domain/collaboration/callout/callout.contribution.default.source.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UUID } from '@domain/common/scalars';
import { WhiteboardService } from '@domain/common/whiteboard';
import {
  CreateWhiteboardDraftOnTemplatesSetInput,
  WhiteboardDraftService,
} from '@domain/common/whiteboard-draft';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplate } from '../template/template.interface';
import { TemplateService } from '../template/template.service';
import { TemplateAuthorizationService } from '../template/template.service.authorization';
import { CreateTemplateOnTemplatesSetInput } from './dto/templates.set.dto.create.template';
import { CreateTemplateFromSpaceOnTemplatesSetInput } from './dto/templates.set.dto.create.template.from.space';
import { CreateTemplateFromContentSpaceOnTemplatesSetInput } from './dto/templates.set.dto.create.template.from.space.content';
import { TemplatesSetService } from './templates.set.service';

@InstrumentResolver()
@Resolver()
export class TemplatesSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    private templateAuthorizationService: TemplateAuthorizationService,
    private templateService: TemplateService,
    private spaceLookupService: SpaceLookupService,
    private templateContentSpaceService: TemplateContentSpaceService,
    private whiteboardService: WhiteboardService,
    private whiteboardDraftService: WhiteboardDraftService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => UUID, {
    description:
      'Materializes a server-owned live Whiteboard draft for a Template form. GraphQL returns identifiers only.',
  })
  async createWhiteboardDraftOnTemplatesSet(
    @CurrentActor() actorContext: ActorContext,
    @Args('draftData') draftData: CreateWhiteboardDraftOnTemplatesSetInput
  ): Promise<string> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      draftData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create whiteboard draft: ${templatesSet.id}`
    );

    let sourceContent: string | undefined;
    let sourceStorageBucketID: string | undefined;
    if (draftData.sourceWhiteboardID) {
      const source = await this.whiteboardService.getWhiteboardOrFail(
        draftData.sourceWhiteboardID,
        { relations: { authorization: true } }
      );
      this.authorizationService.grantAccessOrFail(
        actorContext,
        source.authorization,
        AuthorizationPrivilege.READ,
        `template draft clone whiteboard content from source: ${source.id}`
      );
    }
    if (draftData.sourceCalloutID) {
      const source: ContributionDefaultSourceInput = {
        sourceCalloutID: draftData.sourceCalloutID,
      };
      await this.templateService.prepareContributionDefaultSource(
        source,
        actorContext
      );
      sourceContent = source.whiteboardContent;
      sourceStorageBucketID = source.sourceStorageBucketID;
    }
    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForTemplatesSet(
        templatesSet.id
      );
    return this.whiteboardDraftService.materialize(
      {
        ...draftData,
        sourceContent,
        sourceStorageBucketID,
      },
      storageAggregator,
      templatesSet.authorization,
      actorContext
    );
  }

  @Mutation(() => ITemplate, {
    description: 'Creates a new Template on the specified TemplatesSet.',
  })
  async createTemplate(
    @CurrentActor() actorContext: ActorContext,
    @Args('templateData')
    templateData: CreateTemplateOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templates set create template: ${templatesSet.id}`
    );
    const consumedDraftIDs: string[] = [];
    const whiteboardInputs = [
      templateData.whiteboard,
      templateData.calloutData?.framing?.whiteboard,
    ].filter(input => input?.draftWhiteboardID);
    if (whiteboardInputs.length > 1) {
      throw new ValidationException(
        'A Template create may consume only one framing draft',
        LogContext.TEMPLATES
      );
    }
    const framingInput = whiteboardInputs[0];
    if (framingInput?.draftWhiteboardID) {
      if (framingInput.sourceWhiteboardID) {
        throw new ValidationException(
          'draftWhiteboardID and sourceWhiteboardID are mutually exclusive',
          LogContext.WHITEBOARDS
        );
      }
      const draft = await this.whiteboardDraftService.getForConsumption(
        framingInput.draftWhiteboardID,
        actorContext
      );
      consumedDraftIDs.push(draft.id);
      framingInput.sourceWhiteboardID = draft.id;
      framingInput.draftWhiteboardID = undefined;
    }
    const defaults = templateData.calloutData?.contributionDefaults;
    if (defaults?.draftWhiteboardID) {
      if (defaults.sourceWhiteboardID || defaults.sourceCalloutID) {
        throw new ValidationException(
          'draftWhiteboardID and contribution-default source fields are mutually exclusive',
          LogContext.WHITEBOARDS
        );
      }
      const draft = await this.whiteboardDraftService.getForConsumption(
        defaults.draftWhiteboardID,
        actorContext
      );
      consumedDraftIDs.push(draft.id);
      defaults.sourceWhiteboardID = draft.id;
      defaults.draftWhiteboardID = undefined;
    }
    // A whiteboard template that seeds from a source whiteboard (duplicate / import) must
    // first prove the actor can READ that source before the server copies its stored
    // snapshot — mirrors the callout create path. No-op for any other template.
    const sourceWhiteboardID = templateData.whiteboard?.sourceWhiteboardID;
    if (sourceWhiteboardID) {
      const source = await this.whiteboardService.getWhiteboardOrFail(
        sourceWhiteboardID,
        { relations: { authorization: true } }
      );
      this.authorizationService.grantAccessOrFail(
        actorContext,
        source.authorization,
        AuthorizationPrivilege.READ,
        `template create clone whiteboard content from source: ${sourceWhiteboardID}`
      );
    }
    await this.templateService.prepareContributionDefaultSource(
      templateData.calloutData?.contributionDefaults,
      actorContext
    );
    const template = await this.templatesSetService.createTemplate(
      templatesSet,
      templateData,
      actorContext
    );
    const authorizations =
      await this.templateAuthorizationService.applyAuthorizationPolicy(
        template,
        templatesSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    const result = await this.templateService.getTemplateOrFail(template.id);
    for (const draftID of consumedDraftIDs) {
      try {
        await this.whiteboardDraftService.cleanupConsumed(draftID);
      } catch (error) {
        this.logger.error?.(
          {
            message:
              'Final Template was created but Whiteboard draft cleanup remains retryable',
            templateID: result.id,
            draftID,
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? (error.stack ?? '') : ''
        );
      }
    }
    return result;
  }

  @Mutation(() => ITemplate, {
    description:
      'Creates a new Template on the specified TemplatesSet using the provided Space as content.',
  })
  async createTemplateFromSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('templateData')
    templateData: CreateTemplateFromSpaceOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templatesSet create template from Collaboration, templatesSetId: ${templatesSet.id}`
    );

    const space = await this.spaceLookupService.getSpaceOrFail(
      templateData.spaceID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      space.authorization,
      AuthorizationPrivilege.READ,
      `templatesSet create template from Space, read access, collaborationId:${space.id} templatesSetId:${templatesSet.id}`
    );
    const template = await this.templatesSetService.createTemplateFromSpace(
      templatesSet,
      templateData,
      actorContext
    );
    const authorizations =
      await this.templateAuthorizationService.applyAuthorizationPolicy(
        template,
        templatesSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.templateService.getTemplateOrFail(template.id);
  }

  @Mutation(() => ITemplate, {
    description:
      'Creates a new Template on the specified TemplatesSet using the provided ContentSpace as content.',
  })
  async createTemplateFromContentSpace(
    @CurrentActor() actorContext: ActorContext,
    @Args('templateData')
    templateData: CreateTemplateFromContentSpaceOnTemplatesSetInput
  ): Promise<ITemplate> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templateData.templatesSetID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      templatesSet.authorization,
      AuthorizationPrivilege.CREATE,
      `templatesSet create template from ContentSpace, templatesSetId: ${templatesSet.id}`
    );

    const contentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateData.contentSpaceID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      contentSpace.authorization,
      AuthorizationPrivilege.READ,
      `templatesSet create template from ContentSpace, read access, contentSpaceId:${contentSpace.id} templatesSetId:${templatesSet.id}`
    );

    const template =
      await this.templatesSetService.createTemplateFromContentSpace(
        templatesSet,
        templateData,
        actorContext
      );
    const authorizations =
      await this.templateAuthorizationService.applyAuthorizationPolicy(
        template,
        templatesSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.templateService.getTemplateOrFail(template.id);
  }
}
