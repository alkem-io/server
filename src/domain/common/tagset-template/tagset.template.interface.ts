import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '../entity/base-entity';
import { TagsetType } from '@common/enums/tagset.type';

@ObjectType('TagsetTemplate')
export abstract class ITagsetTemplate extends IBaseAlkemio {
  @Field(() => String)
  name!: string;

  @Field(() => [String])
  allowedValues!: string[];

  @Field(() => TagsetType)
  type!: TagsetType;
}
