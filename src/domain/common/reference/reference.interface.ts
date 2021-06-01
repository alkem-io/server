import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '../authorizable-entity';

@ObjectType('Reference')
export abstract class IReference extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  uri!: string;

  @Field(() => String)
  description?: string;
}
