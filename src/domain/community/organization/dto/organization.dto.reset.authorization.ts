import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class OrganizationAuthorizationResetInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The identifier of the Organization whose Authorization Policy should be reset.',
  })
  organizationID!: string;
}
