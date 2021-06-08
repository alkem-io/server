import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerifiedCredential {
  @Field(() => String, {
    description: 'The stringified representation of the VC',
  })
  info: string;

  constructor() {
    this.info = '';
  }
}
