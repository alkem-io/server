import { IBaseCherrytwist } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('NVP')
export abstract class INVP extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value?: string;
}
