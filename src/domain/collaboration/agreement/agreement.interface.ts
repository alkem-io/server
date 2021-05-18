import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Tagset } from '@domain/common/tagset';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Agreement')
export abstract class IAgreement extends IBaseCherrytwist {
  @Field(() => String)
  name?: string;

  @Field(() => String)
  description?: string;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the agreement',
  })
  tagsset?: ITagset;
}
