import { TagsetType } from '@common/enums/tagset.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IClassification } from '../classification/classification.interface';
import { IProfile } from '../profile';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';

@ObjectType('Tagset')
export abstract class ITagset extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => TagsetType)
  type!: TagsetType;

  @Field(() => [String])
  tags!: string[];

  tagsetTemplate?: ITagsetTemplate;
  profile?: IProfile;
  classification?: IClassification;
}
