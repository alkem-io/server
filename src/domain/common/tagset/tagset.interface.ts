import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Tagset')
export abstract class ITagset extends IBaseCherrytwist {
  @Field(() => String)
  name!: string;

  @Field(() => [String])
  tags!: string[];
}
