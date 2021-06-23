import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('Reference')
export abstract class IReference extends IAuthorizable {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  uri!: string;

  @Field(() => String)
  description?: string;
}
