import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateAuthorizationPolicyInput {
  @Field({ nullable: false })
  anonymousReadAccess!: boolean;
}
