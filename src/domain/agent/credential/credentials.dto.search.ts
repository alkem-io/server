import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CredentialsSearchInput {
  @Field({
    nullable: false,
    description: 'The type of credential.',
  })
  type!: string;

  @Field({
    nullable: true,
    description: 'The resource to which a credential needs to be bound.',
  })
  resourceID?: number;
}
