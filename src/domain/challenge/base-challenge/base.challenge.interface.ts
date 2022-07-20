import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IPreferenceSet } from '@domain/common/preference-set';
// import { ICollaboration } from '@domain/collaboration';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameable {
  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  tagset?: ITagset;
  agent?: IAgent;
  // @Field(() => ICollaboration, {
  //   nullable: true,
  //   description: 'Collaboration object for the base challenge',
  // })
  // collaboration?: ICollaboration;
  context?: IContext;
  community?: ICommunity;
  lifecycle?: ILifecycle;
  preferenceSet?: IPreferenceSet;
}
