import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IKnowledgeBase } from './knowledge.base.interface';
import { AuthorizationAgentPrivilege } from '@common/decorators';
import { Loader } from '@core/dataloader/decorators';
import { KnowledgeBase } from './knowledge.base.entity';
import {
  KnowledgeBaseCalloutsSetLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver(() => IKnowledgeBase)
export class KnowledgeBaseResolverFields {
  constructor() {}

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for describing this KnowledgeBase.',
  })
  async profile(
    @Parent() knowledgeBase: IKnowledgeBase,
    @Loader(ProfileLoaderCreator, {
      parentClassRef: KnowledgeBase,
      checkPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(knowledgeBase.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('calloutsSet', () => ICalloutsSet, {
    nullable: false,
    description: 'The calloutsSet with Callouts in use by this KnowledgeBase',
  }) // todo
  async calloutsSet(
    @Parent() knowledgeBase: IKnowledgeBase,
    @Loader(KnowledgeBaseCalloutsSetLoaderCreator) loader: ILoader<ICalloutsSet>
  ): Promise<ICalloutsSet> {
    return loader.load(knowledgeBase.id);
  }
}
