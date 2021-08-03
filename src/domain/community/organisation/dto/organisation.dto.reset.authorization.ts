import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganisationAuthorizationResetInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description:
      'The identifier of the Organisation whose AuthorizationDefinition should be reset.',
  })
  organisationID!: string;
}
