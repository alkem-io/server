import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ITagsetTemplate } from '../tagset-template';

@ObjectType('Tagset')
export abstract class ITagset extends IAuthorizable {
  @Field(() => [String])
  tags!: string[];

  tagsetTemplate?: ITagsetTemplate;
}
