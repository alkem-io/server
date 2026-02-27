import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  KnowledgeBaseCalloutsSetLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { KnowledgeBase } from './knowledge.base.entity';
import { IKnowledgeBase } from './knowledge.base.interface';

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
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(knowledgeBase.id);
  }

  @ResolveField('calloutsSet', () => ICalloutsSet, {
    nullable: false,
    description: 'The calloutsSet with Callouts in use by this KnowledgeBase',
  })
  async calloutsSet(
    @Parent() knowledgeBase: IKnowledgeBase,
    @Loader(KnowledgeBaseCalloutsSetLoaderCreator, {
      parentClassRef: KnowledgeBase,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<ICalloutsSet>
  ): Promise<ICalloutsSet> {
    return loader.load(knowledgeBase.id);
  }
}
