import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '../authorizable-entity';
import { NameID } from '../scalars';

@ObjectType('IBaseCherrytwist')
export abstract class INameable extends IAuthorizable {
  @Field(() => String, {
    nullable: false,
    description: 'The display name.',
  })
  displayName!: string;

  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;
}
