import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class BeginCredentialOfferInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The types of the credentials that will be required.',
  })
  types!: string[];
}
