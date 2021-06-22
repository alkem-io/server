import { IBaseCherrytwist } from '@domain/common/entity/base-entity';
import { ITagset } from '@domain/common/tagset';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Agreement')
export abstract class IAgreement extends IBaseCherrytwist {
  @Field(() => String)
  name?: string;

  @Field(() => String)
  description?: string;

  @Field(() => ITagset, {
    nullable: true,
    description: 'The set of tags for the agreement',
  })
  tagsset?: ITagset;
}
