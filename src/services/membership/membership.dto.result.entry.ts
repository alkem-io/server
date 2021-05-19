import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MembershipResultEntry {
  @Field(() => String, {
    description: 'Name of the entity',
  })
  name: string;

  @Field(() => String, {
    description: 'ID of the entry',
  })
  id: string;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }
}
