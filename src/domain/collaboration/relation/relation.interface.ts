import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Relation')
export abstract class IRelation extends IBaseCherrytwist {
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
