import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateCredentialInput {
  @Field({
    nullable: false,
    description: 'The type of credential that is being created.',
  })
  type!: string;

  @Field({
    nullable: true,
    description: 'The resource to which access is being delegated.',
  })
  resourceID?: string;
}
