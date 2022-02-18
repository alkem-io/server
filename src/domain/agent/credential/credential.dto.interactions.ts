import { InputType, ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class BeginCredentialRequestOutput {
  @Field({
    nullable: false,
    description: 'The interaction id for this credential request.',
  })
  interactionId!: string;

  @Field({
    nullable: false,
    description:
      'The token containing the information about issuer, callback endpoint and credential requirements',
  })
  jwt!: string;

  @Field({
    nullable: false,
    description:
      'The token can be consumed until the expiresOn date (milliseconds since the UNIX epoch) is reached',
  })
  expiresOn!: number;
}

@InputType()
export class BeginCredentialRequestInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The types of the credentials that will be required.',
  })
  types!: string[];
}

@InputType()
export class BeginCredentialOfferInput {
  @Field(() => [String], {
    nullable: false,
    description: 'The types of the credentials that will be offered.',
  })
  types!: string[];
}

@ObjectType()
export class BeginCredentialOfferOutput {
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
