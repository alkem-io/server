import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateAuthorizationDefinitionInput {
  @Field({ nullable: false })
  anonymousReadAccess!: boolean;
}
