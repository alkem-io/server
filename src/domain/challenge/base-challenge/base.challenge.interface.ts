import { ITagset } from '@domain/common/tagset';
import { Field, ObjectType } from '@nestjs/graphql';
import { IContext } from '@domain/context/context';
import { ICommunity } from '@domain/community/community';
import { ILifecycle } from '@domain/common/lifecycle';
import { INameable } from '@domain/common/nameable-entity';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends INameable {
  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  tagset?: ITagset;

  context?: IContext;
  community?: ICommunity;
  lifecycle?: ILifecycle;
}
