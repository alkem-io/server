import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Reference')
export abstract class IReference extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  uri!: string;

  @Field(() => String)
  description?: string;
}
