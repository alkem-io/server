/**
 * How an actor came to hold a role in a community. Used to suppress the
 * generic "a new member joined" admin notification when the membership was
 * the outcome of accepting an invitation: the Space admins already receive a
 * dedicated "X accepted the invitation" outcome notification (FR-020), so
 * firing both would notify them twice for one event.
 *
 * There is deliberately NO `APPLICATION` origin. No application-approved
 * notification event exists (`SPACE_ADMIN_COMMUNITY_APPLICATION` fires at
 * submission, not at approval), so an approved application has no
 * replacement notification and must keep producing the ordinary
 * "a new member joined" for the approving admin's co-admins.
 */
export enum CommunityMembershipOrigin {
  /** Direct assignment by an admin, a direct join, an approved application, bootstrap, conversion. */
  DIRECT = 'DIRECT',
  /** The actor accepted an invitation to the community. */
  INVITATION = 'INVITATION',
}
