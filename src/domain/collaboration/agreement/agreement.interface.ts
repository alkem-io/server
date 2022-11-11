import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Agreement')
export abstract class IAgreement extends IBaseAlkemio {
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
