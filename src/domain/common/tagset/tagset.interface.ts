import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '../authorizable-entity';

@ObjectType('Tagset')
export abstract class ITagset extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => [String])
  tags!: string[];
}
