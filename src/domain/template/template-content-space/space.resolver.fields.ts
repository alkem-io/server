import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { TemplateContentSpace } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.entity';
import { NameID } from '@domain/common/scalars';
import { ICommunity } from '@domain/community/community';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { TemplateContentSpaceService } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.service';
import { ITemplateContentSpace } from '@domain/templateContentSpace/templateContentSpace/templateContentSpace.interface';
import { IAgent } from '@domain/agent/agent';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { Loader } from '@core/dataloader/decorators';
import {
  TemplateContentSpaceCollaborationLoaderCreator,
  TemplateContentSpaceCommunityLoaderCreator,
  TemplateContentSpaceAboutLoaderCreator,
  AgentLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ITemplateContentSpaceSettings } from '../templateContentSpace.settings/templateContentSpace.settings.interface';
import { IAccount } from '../account/account.interface';
import { ITemplateContentSpaceSubscription } from './templateContentSpace.license.subscription.interface';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseLoaderCreator } from '@core/dataloader/creators/loader.creators/license.loader.creator';
import { ITemplateContentSpaceAbout } from '../templateContentSpace.about';

@Resolver(() => ITemplateContentSpace)
export class TemplateContentSpaceResolverFields {
  constructor(
    private templateContentSpaceService: TemplateContentSpaceService
  ) {}

  // Check authorization inside the field resolver directly on the Community
  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: false,
    description: 'Get the Community for the TemplateContentSpace. ',
  })
  async community(
    @Parent() templateContentSpace: TemplateContentSpace,
    @Loader(TemplateContentSpaceCommunityLoaderCreator, {
      parentClassRef: TemplateContentSpace,
    })
    loader: ILoader<ICommunity>
  ): Promise<ICommunity> {
    const community = await loader.load(templateContentSpace.id);
    // Do not check for READ access here, rely on per field check on resolver in Community
    return community;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ_ABOUT)
  @UseGuards(GraphqlGuard)
  @ResolveField('about', () => ITemplateContentSpaceAbout, {
    nullable: false,
    description: 'About this templateContentSpace.',
  })
  async about(
    @Parent() templateContentSpace: TemplateContentSpace,
    @Loader(TemplateContentSpaceAboutLoaderCreator, {
      parentClassRef: TemplateContentSpace,
    })
    loader: ILoader<ITemplateContentSpaceAbout>
  ): Promise<ITemplateContentSpaceAbout> {
    const about = await loader.load(templateContentSpace.id);
    return about;
  }

  @ResolveField('subscriptions', () => [ITemplateContentSpaceSubscription], {
    nullable: false,
    description: 'The subscriptions active for this TemplateContentSpace.',
  })
  async subscriptions(@Parent() templateContentSpace: ITemplateContentSpace) {
    return await this.templateContentSpaceService.getSubscriptions(
      templateContentSpace
    );
  }

  @ResolveField('activeSubscription', () => ITemplateContentSpaceSubscription, {
    nullable: true,
    description:
      'The "highest" subscription active for this TemplateContentSpace.',
  })
  async activeSubscription(
    @Parent() templateContentSpace: ITemplateContentSpace
  ) {
    return this.templateContentSpaceService.activeSubscription(
      templateContentSpace
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: false,
    description: 'The collaboration for the TemplateContentSpace.',
  })
  async collaboration(
    @Parent() templateContentSpace: TemplateContentSpace,
    @Loader(TemplateContentSpaceCollaborationLoaderCreator, {
      parentClassRef: TemplateContentSpace,
    })
    loader: ILoader<ICollaboration>
  ): Promise<ICollaboration> {
    return loader.load(templateContentSpace.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ_LICENSE)
  @UseGuards(GraphqlGuard)
  @ResolveField('license', () => ILicense, {
    nullable: false,
    description: 'The License operating on this TemplateContentSpace.',
  })
  async license(
    @Parent() templateContentSpace: ITemplateContentSpace,
    @Loader(LicenseLoaderCreator, { parentClassRef: TemplateContentSpace })
    loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(templateContentSpace.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this TemplateContentSpace.',
  })
  async agent(
    @Parent() templateContentSpace: TemplateContentSpace,
    @Loader(AgentLoaderCreator, { parentClassRef: TemplateContentSpace })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(templateContentSpace.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: false,
    description: 'The StorageAggregator in use by this TemplateContentSpace',
  })
  async storageAggregator(
    @Parent() templateContentSpace: TemplateContentSpace
  ): Promise<IStorageAggregator> {
    return await this.templateContentSpaceService.getStorageAggregatorOrFail(
      templateContentSpace.id
    );
  }

  @ResolveField('subtemplateContentSpaces', () => [ITemplateContentSpace], {
    nullable: false,
    description: 'The subtemplateContentSpaces for the templateContentSpace.',
  })
  async subtemplateContentSpaces(
    @Parent() templateContentSpace: ITemplateContentSpace,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ): Promise<ITemplateContentSpace[]> {
    return await this.templateContentSpaceService.getSubtemplateContentSpaces(
      templateContentSpace,
      args
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('account', () => IAccount, {
    nullable: false,
    description: 'The Account that this TemplateContentSpace is part of.',
  })
  async account(
    @Parent() templateContentSpace: ITemplateContentSpace
  ): Promise<IAccount> {
    return await this.templateContentSpaceService.getAccountForLevelZeroTemplateContentSpaceOrFail(
      templateContentSpace
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(
    'subtemplateContentSpaceByNameID',
    () => ITemplateContentSpace,
    {
      nullable: false,
      description: 'A particular subtemplateContentSpace by its nameID',
    }
  )
  async subtemplateContentSpace(
    @Args('NAMEID', { type: () => NameID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplateContentSpace> {
    const subtemplateContentSpace =
      await this.templateContentSpaceService.getSubtemplateContentSpaceByNameIdInLevelZeroTemplateContentSpace(
        id,
        templateContentSpace.levelZeroTemplateContentSpaceID
      );
    if (!subtemplateContentSpace) {
      throw new EntityNotFoundException(
        `Unable to find subtemplateContentSpace with ID: '${id}'`,
        LogContext.SPACES,
        {
          subtemplateContentSpaceId: id,
          templateContentSpaceId: templateContentSpace.id,
          userId: agentInfo.userID,
        }
      );
    }
    return subtemplateContentSpace;
  }

  @ResolveField('createdDate', () => Date, {
    nullable: true,
    description: 'The date for the creation of this TemplateContentSpace.',
  })
  async createdDate(
    @Parent() templateContentSpace: TemplateContentSpace
  ): Promise<Date> {
    const createdDate = (templateContentSpace as TemplateContentSpace)
      .createdDate;
    return new Date(createdDate);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('settings', () => ITemplateContentSpaceSettings, {
    nullable: false,
    description: 'The settings for this TemplateContentSpace.',
  })
  settings(
    @Parent() templateContentSpace: ITemplateContentSpace
  ): ITemplateContentSpaceSettings {
    return templateContentSpace.settings;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templatesManager', () => ITemplatesManager, {
    nullable: true,
    description: 'The TemplatesManager in use by this TemplateContentSpace',
  })
  async templatesManager(
    @Parent() templateContentSpace: ITemplateContentSpace
  ): Promise<ITemplatesManager> {
    return await this.templateContentSpaceService.getTemplatesManagerOrFail(
      templateContentSpace.levelZeroTemplateContentSpaceID
    );
  }
}
