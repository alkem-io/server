/**
 * How an actor came to hold a role in a community. Used to suppress the
 * generic "a new member joined" admin notification when the membership was
 * the outcome of an invitation or an application: the Space admins already
 * receive an outcome notification for those (or performed the approval
 * themselves), so firing both would notify them twice for one event.
 */
export enum CommunityMembershipOrigin {
  /** Direct assignment by an admin, a direct join, bootstrap, conversion. */
  DIRECT = 'DIRECT',
  /** The actor accepted an invitation to the community. */
  INVITATION = 'INVITATION',
  /** An admin approved the actor's application to the community. */
  APPLICATION = 'APPLICATION',
}
