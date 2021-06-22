import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Relation')
export abstract class IRelation extends IAuthorizable {
  @Field(() => String)
  type?: string;

  @Field(() => String)
  actorName?: string;

  @Field(() => String)
  actorType?: string;

  @Field(() => String)
  actorRole?: string;

  @Field(() => String)
  description?: string;
}
