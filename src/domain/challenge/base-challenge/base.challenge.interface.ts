import { Field, ObjectType } from '@nestjs/graphql';
import { INameableOld } from '@domain/common/entity/nameable-entity/nameable.interface.old';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IPreferenceSet } from '@domain/common/preference-set';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameableOld {
  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  tagset?: ITagset;
  agent?: IAgent;
  @Field(() => ICollaboration, {
    nullable: true,
    description: 'Collaboration object for the base challenge',
  })
  collaboration?: ICollaboration;
  context?: IContext;
  community?: ICommunity;
  lifecycle?: ILifecycle;
  preferenceSet?: IPreferenceSet;
}
