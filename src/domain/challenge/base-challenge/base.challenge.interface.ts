import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { INameable } from '@domain/common/nameable-entity';
import { IAgent } from '@domain/agent/agent/agent.interface';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameable {
  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  tagset?: ITagset;

  agent?: IAgent;

  context?: IContext;
  community?: ICommunity;
  lifecycle?: ILifecycle;
}
