import { OrganizationAssociateEligibilityReason } from '@common/enums/organization.associate.eligibility.reason';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationAssociateEligibility')
export class IOrganizationAssociateEligibility {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the viewer may apply to associate with this organization right now.',
  })
  canApply!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the viewer may join this organization directly, with one click (domain match).',
  })
  canJoinDirectly!: boolean;

  @Field(() => OrganizationAssociateEligibilityReason, {
    nullable: false,
    description: 'Why the viewer is (or is not) eligible, precedence-ordered.',
  })
  reason!: OrganizationAssociateEligibilityReason;
}
