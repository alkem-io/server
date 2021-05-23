import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseCherrytwist } from '../base-entity';
import { NameID } from '../scalars';

@ObjectType('IBaseCherrytwist')
export abstract class INameable extends IBaseCherrytwist {
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

  // The scope within which the provided nameID is unique
  nameableScopeID!: string;
}
