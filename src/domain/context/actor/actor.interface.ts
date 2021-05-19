import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Actor')
export abstract class IActor extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'A description of this actor',
  })
  description?: string;

  @Field(() => String, {
    nullable: true,
    description: 'A value derived by this actor',
  })
  value?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The change / effort required of this actor',
  })
  impact?: string;
}
