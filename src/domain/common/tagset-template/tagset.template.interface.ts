import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '../entity/base-entity';
import { TagsetType } from '@common/enums/tagset.type';
import { ITagset } from '../tagset/tagset.interface';

@ObjectType('TagsetTemplate')
export abstract class ITagsetTemplate extends IBaseAlkemio {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: 'For Tagsets of type SELECT_ONE, the default selected value.',
    nullable: true,
  })
  defaultSelectedValue?: string;

  @Field(() => [String])
  allowedValues!: string[];

  @Field(() => TagsetType)
  type!: TagsetType;

  tagsets?: ITagset[];
}
