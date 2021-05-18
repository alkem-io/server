import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { Tagset } from '@domain/common/tagset';
import { IContext } from '@domain/context';
import { ICommunity } from '@domain/community/community';
import { ILifecycle } from '@domain/common';
import { IBaseCherrytwist } from '@domain/common/base-entity/base.cherrytwist.interface';

@ObjectType('IBaseChallenge')
export abstract class IBaseChallenge extends IBaseCherrytwist {
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

  ecoverseID!: string;

  context?: IContext;
  community?: ICommunity;
  lifecycle?: ILifecycle;
}
