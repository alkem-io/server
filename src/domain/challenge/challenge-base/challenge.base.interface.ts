import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Tagset } from '@domain/common/tagset';
import { IContext } from '@domain/context';
import { ICommunity } from '@domain/community/community';
import { ILifecycle } from '@domain/common';

@ObjectType('IChallengeBase')
export abstract class IChallengeBase {
  @Field(() => ID, {
    nullable: false,
    description: 'The ID of the entity',
  })
  id!: number;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the challenge',
  })
  name!: string;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this challenge',
  })
  textID!: string;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  tagset?: ITagset;

  context?: IContext;
  community?: ICommunity;
  lifecycle?: ILifecycle;
}
