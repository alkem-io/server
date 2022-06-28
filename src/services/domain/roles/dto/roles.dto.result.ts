import { NameID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RolesResult {
  @Field(() => String, {
    description: 'A unique identifier for this membership result.',
  })
  id: string;

  @Field(() => NameID, {
    description: 'Name Identifier of the entity',
  })
  nameID: string;

  @Field(() => String, {
    description: 'Display name of the entity',
  })
  displayName: string;

  @Field(() => [String], {
    description: 'The roles held by the contributor',
  })
  roles: string[];

  constructor(nameID: string, id: string, displayName: string) {
    this.displayName = displayName;
    this.nameID = nameID;
    this.id = id;
    this.roles = [];
  }
}
