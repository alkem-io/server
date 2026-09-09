/**
 * How an actor came to hold a role in a community. Used to suppress the
 * generic "a new member joined" admin notification when the membership was
 * the outcome of a step the admins were already notified about, so one event
 * never produces two notifications.
 *
 * Per the product brief, that notification fires "only when there was no
 * invitation **or application** step". INVITATION has a dedicated replacement
 * ("X accepted the invitation", FR-020). APPLICATION currently has NO
 * replacement event -- `SPACE_ADMIN_COMMUNITY_APPLICATION` fires at
 * submission, not at approval -- so the approving admin's co-admins are told
 * nothing at approval time. That is a known and accepted consequence of
 * following the brief literally, not an oversight; the follow-up is to add an
 * application-approved event, tracked on alkem-io/server#4100.
 */
export enum CommunityMembershipOrigin {
  /** Direct assignment by an admin, a direct join, bootstrap, conversion. */
  DIRECT = 'DIRECT',
  /** The actor accepted an invitation to the community. */
  INVITATION = 'INVITATION',
  /** The actor's application to the community was approved. */
  APPLICATION = 'APPLICATION',
}
