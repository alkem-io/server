import { registerEnumType } from '@nestjs/graphql';

// The viewer-relative reason behind `Organization.myAssociateEligibility`.
// Precedence (first match wins) is documented on the resolver: NOT_AUTHENTICATED
// -> ALREADY_ASSOCIATE -> INVITATION_PENDING -> APPLICATION_PENDING ->
// ELIGIBLE_TO_JOIN -> APPLICATIONS_NOT_ACCEPTED -> APPLY_NOT_GRANTED ->
// ELIGIBLE_TO_APPLY.
export enum OrganizationAssociateEligibilityReason {
  ELIGIBLE_TO_JOIN = 'ELIGIBLE_TO_JOIN',
  ELIGIBLE_TO_APPLY = 'ELIGIBLE_TO_APPLY',
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  ALREADY_ASSOCIATE = 'ALREADY_ASSOCIATE',
  INVITATION_PENDING = 'INVITATION_PENDING',
  APPLICATION_PENDING = 'APPLICATION_PENDING',
  APPLICATIONS_NOT_ACCEPTED = 'APPLICATIONS_NOT_ACCEPTED',
  // The stored APPLY credential rule has not been bound onto this
  // organization yet (the Release NN authorization reset loop has not run
  // for it) — never surfaced as an error, only as this reason.
  APPLY_NOT_GRANTED = 'APPLY_NOT_GRANTED',
}

registerEnumType(OrganizationAssociateEligibilityReason, {
  name: 'OrganizationAssociateEligibilityReason',
});
