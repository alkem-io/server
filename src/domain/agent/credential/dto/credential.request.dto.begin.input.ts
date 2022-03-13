import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class BeginCredentialRequestInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The types of the credentials that will be required.',
  })
  types!: string[];
}
