import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('Tagset')
export abstract class ITagset extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => [String])
  tags!: string[];
}
