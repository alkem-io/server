/**
 * How an actor came to hold a role in a community. Used to suppress the
 * generic "a new member joined" admin notification when the membership was
 * the outcome of a step the admins were already notified about, so one event
 * never produces two notifications.
 *
 * The rule is: **suppress only where a replacement notification exists.** An
 * accepted INVITATION has one -- "X accepted the invitation" reaches every
 * admin of the invited Space (FR-020) -- so the generic notification would be
 * the second of a pair, which is what the product brief rules out.
 *
 * An approved APPLICATION deliberately has NO member here. There is no
 * application-approved event to take the suppressed notification's place --
 * `SPACE_ADMIN_COMMUNITY_APPLICATION` fires at submission, not at approval --
 * so suppressing it leaves the approving admin's co-admins told nothing at
 * all. Zero is not one, and that flow is outside what server#4100 changes.
 * The member is omitted rather than left unused so it cannot be quietly
 * reintroduced (ruling R40, restoring R31; R35 had briefly added it).
 *
 * Adding the missing application-approved event is tracked as
 * alkem-io/server#6476. If it lands, add the member back here and thread it in
 * `RoleSetService.ensureMemberOfRoleSetAndAncestors` -- at that point the
 * replacement exists and the suppression becomes correct.
 */
export enum CommunityMembershipOrigin {
  /** Direct assignment by an admin, a direct join, bootstrap, conversion. */
  DIRECT = 'DIRECT',
  /** The actor accepted an invitation to the community. */
  INVITATION = 'INVITATION',
}
