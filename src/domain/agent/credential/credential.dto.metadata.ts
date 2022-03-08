import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CredentialMetadataContext implements Record<string, string> {
  [x: string]: string;
}

@ObjectType()
export class CredentialMetadataOutput {
  @Field({
    nullable: false,
    description: 'The display name of the credential',
  })
  name!: string;

  @Field({
    nullable: false,
    description: 'The purpose of the credential',
  })
  description!: string;

  @Field({
    nullable: false,
    description: 'The schema that the credential will be validated against',
  })
  schema!: string;

  @Field(() => [String], {
    nullable: false,
    description:
      'The credential types that are associated with this credential',
  })
  types!: string[];

  @Field({
    nullable: false,
    description: 'System recognized unique type for the credential',
  })
  uniqueType!: string;

  // This should be JSON but don't know the type
  @Field(() => String, {
    nullable: false,
    description:
      'A json description of what the claim contains and schema validation definition',
  })
  context!: string;
}
