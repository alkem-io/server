import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('Classification')
export abstract class IClassification extends IAuthorizable {
  tagsets?: ITagset[];
}
