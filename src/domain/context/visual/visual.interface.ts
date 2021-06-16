import { IBaseCherrytwist } from '@domain/common';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Visual')
export abstract class IVisual extends IBaseCherrytwist {
  @Field(() => String)
  avatar!: string;

  @Field(() => String)
  background!: string;

  @Field(() => String)
  banner!: string;
}
