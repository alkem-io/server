import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { VirtualContributor } from './virtual.contributor.entity';
import { VirtualContributorService } from './virtual.contributor.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile';
import { AuthorizationActorPrivilege, CurrentActor } from '@common/decorators';
import { ActorContext } from '@core/actor-context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Loader } from '@core/dataloader/decorators';
import {
  AccountLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IVirtualContributor } from './virtual.contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { VirtualContributorStatus } from '@common/enums/virtual.contributor.status.enum';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VirtualContributorModelCard } from '../virtual-contributor-model-card/dto/virtual.contributor.model.card.dto.result';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { IAiPersona } from '@services/ai-server/ai-persona';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { PlatformWellKnownVirtualContributorsService } from '@platform/platform.well.known.virtual.contributors';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverFields {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private aiServerAdapter: AiServerAdapter,
    private platformWellKnownVirtualContributorsService: PlatformWellKnownVirtualContributorsService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(
    'wellKnownVirtualContributor',
    () => VirtualContributorWellKnown,
    {
      nullable: true,
      description:
        'The well-known identifier of this Virtual Contributor, if configured at platform level.',
    }
  )
  async wellKnownVirtualContributor(
    @Parent() virtualContributor: VirtualContributor
  ): Promise<VirtualContributorWellKnown | undefined> {
    // Reverse lookup: check all platform mappings to find if this VC ID is registered
    const mappings =
      await this.platformWellKnownVirtualContributorsService.getMappings();
    for (const [wellKnown, vcId] of Object.entries(mappings)) {
      if (vcId === virtualContributor.id) {
        return wellKnown as VirtualContributorWellKnown;
      }
    }
    return undefined;
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('engine', () => AiPersonaEngine, {
    nullable: false,
    description: 'The engine powering this Virtual Contributor',
  })
  async engine(
    @Parent() virtualContributor: VirtualContributor
  ): Promise<AiPersonaEngine> {
    return await this.aiServerAdapter.getPersonaEngine(
      virtualContributor.aiPersonaID
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aiPersona', () => IAiPersona, {
    nullable: false,
    description: 'The aiPersona behind this Virtual Contributor',
  })
  async aiPersona(
    @Parent() virtualContributor: VirtualContributor
  ): Promise<IAiPersona> {
    return await this.aiServerAdapter.getPersonaOrFail(
      virtualContributor.aiPersonaID
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('modelCard', () => VirtualContributorModelCard, {
    nullable: false,
    description: 'The model card information about this Virtual Contributor',
  })
  async modelCard(
    @Parent() virtualContributor: VirtualContributor
  ): Promise<VirtualContributorModelCard> {
    const engine = await this.aiServerAdapter.getPersonaEngine(
      virtualContributor.aiPersonaID
    );
    const aiPersona = await this.aiServerAdapter.getPersonaOrFail(
      virtualContributor.aiPersonaID
    );

    const modelCard: VirtualContributorModelCard = {
      aiPersona,
      aiPersonaEngine: engine,
    };

    return modelCard;
  }

  @ResolveField('account', () => IAccount, {
    nullable: true,
    description: 'The Account of the Virtual Contributor.',
  })
  async account(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(AccountLoaderCreator, {
      parentClassRef: VirtualContributor,
      checkParentPrivilege: AuthorizationPrivilege.READ,
      resolveToNull: true,
    })
    loader: ILoader<IAccount | null>
  ): Promise<IAccount | null> {
    return loader.load(virtualContributor.id);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  async authorization(@Parent() parent: VirtualContributor) {
    return parent.authorization;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this Virtual.',
  })
  async profile(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(ProfileLoaderCreator, {
      parentClassRef: VirtualContributor,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ) {
    return loader.load(virtualContributor.id);
  }

  @ResolveField('knowledgeBase', () => IKnowledgeBase, {
    nullable: true,
    description: 'The KnowledgeBase being used by this virtual contributor',
  })
  async knowledgeBase(
    @Parent() virtualContributor: VirtualContributor,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IKnowledgeBase> {
    const knowledgeBase =
      await this.virtualContributorService.getKnowledgeBaseOrFail(
        virtualContributor
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      knowledgeBase.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      'KnowledgeBase ReadAbout'
    );
    return knowledgeBase;
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('provider', () => IActor, {
    nullable: false,
    description: 'The Virtual Contributor provider.',
  })
  async provider(
    @Parent() virtualContributor: IVirtualContributor
  ): Promise<IActor> {
    return await this.virtualContributorService.getProvider(virtualContributor);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('status', () => VirtualContributorStatus, {
    nullable: false,
    description: 'The status of the virtual contributor',
  })
  async status(
    @Parent() virtualContributor: IVirtualContributor
  ): Promise<VirtualContributorStatus> {
    const lastUpdated =
      await this.virtualContributorService.getBodyOfKnowledgeLastUpdated(
        virtualContributor
      );

    if (!!lastUpdated) {
      return VirtualContributorStatus.READY;
    }
    return VirtualContributorStatus.INITIALIZING;
  }
}
