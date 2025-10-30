import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { VirtualContributor } from './virtual.contributor.entity';
import { VirtualContributorService } from './virtual.contributor.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile';
import { AuthorizationAgentPrivilege, CurrentUser } from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Loader } from '@core/dataloader/decorators';
import {
  AccountLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IVirtualContributor } from './virtual.contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IContributor } from '../contributor/contributor.interface';
import { VirtualContributorStatus } from '@common/enums/virtual.contributor.status.enum';
import { IKnowledgeBase } from '@domain/common/knowledge-base/knowledge.base.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VirtualContributorModelCard } from '../virtual-contributor-model-card/dto/virtual.contributor.model.card.dto.result';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { IAiPersona } from '@services/ai-server/ai-persona';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverFields {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private aiServerAdapter: AiServerAdapter
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this User.',
  })
  async agent(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(AgentLoaderCreator, {
      parentClassRef: VirtualContributor,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(virtualContributor.id);
  }

  @ResolveField('knowledgeBase', () => IKnowledgeBase, {
    nullable: true,
    description: 'The KnowledgeBase being used by this virtual contributor',
  })
  async knowledgeBase(
    @Parent() virtualContributor: VirtualContributor,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IKnowledgeBase> {
    const knowledgeBase =
      await this.virtualContributorService.getKnowledgeBaseOrFail(
        virtualContributor
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      knowledgeBase.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      'KnowledgeBase ReadAbout'
    );
    return knowledgeBase;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('provider', () => IContributor, {
    nullable: false,
    description: 'The Virtual Contributor provider.',
  })
  async provider(
    @Parent() virtualContributor: IVirtualContributor
  ): Promise<IContributor> {
    return await this.virtualContributorService.getProvider(virtualContributor);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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
