import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('NVP')
export abstract class INVP extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value?: string;
}
