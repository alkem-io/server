import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationAuthorizationResetInput {
  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description:
      'The identifier of the Organization whose Authorization Policy should be reset.',
  })
  organizationID!: string;
}
