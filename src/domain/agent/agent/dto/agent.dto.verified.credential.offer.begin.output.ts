import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentBeginVerifiedCredentialOfferOutput {
  @Field({
    nullable: false,
    description:
      'The token containing the information about issuer, callback endpoint and the credentials offered',
  })
  jwt!: string;
}
