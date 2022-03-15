import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentBeginVerifiedCredentialOfferOutput {
  @Field({
    nullable: false,
    description: 'The interaction id for this credential offer.',
  })
  interactionId!: string;

  @Field({
    nullable: false,
    description:
      'The token containing the information about issuer, callback endpoint and the credentials offered',
  })
  jwt!: string;

  @Field({
    nullable: false,
    description:
      'The token can be consumed until the expiresOn date (milliseconds since the UNIX epoch) is reached',
  })
  expiresOn!: number;
}
