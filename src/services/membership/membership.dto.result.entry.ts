import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MembershipResultEntry {
  @Field(() => String, {
    description: 'Name of the entity',
  })
  name: string;

  @Field(() => UUID, {
    description: 'The ID of the entry the user is a member of.',
  })
  id: string;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }
}
