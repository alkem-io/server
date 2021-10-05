import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('NVP')
export abstract class INVP extends IBaseAlkemio {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  value?: string;

  sortOrder!: number;
}
