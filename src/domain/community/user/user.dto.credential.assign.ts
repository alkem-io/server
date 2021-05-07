import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AssignCredentialInput {
  @Field({
    nullable: false,
    description: 'The user to whom the credential is being granted.',
  })
  userID!: number;

  @Field(() => String, { nullable: false })
  type!: string;

  @Field({
    nullable: true,
    description: 'The resource to which this credential is tied.',
  })
  resourceID?: number;
}
