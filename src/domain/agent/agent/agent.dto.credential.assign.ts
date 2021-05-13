import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GrantCredentialInput {
  @Field({
    nullable: false,
    description: 'The Agent to whom the credential is being granted.',
  })
  agentID!: number;

  @Field(() => String, { nullable: false })
  type!: string;

  @Field({
    nullable: true,
    description: 'The resource to which this credential is tied.',
  })
  resourceID?: number;
}
