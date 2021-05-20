import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseCherrytwist } from '../base-entity';

@ObjectType('IBaseCherrytwist')
export abstract class IIdentifiable extends IBaseCherrytwist {
  @Field(() => String, { nullable: false, description: '' })
  name!: string;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this Organisation',
  })
  textID!: string;
}
