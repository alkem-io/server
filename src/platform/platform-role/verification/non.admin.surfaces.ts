/**
 * 027-platform-role-redesign (QA cross-census-1, 2026-09-25) — the census's
 * COMPLEMENT: every `Mutation` field and every `platformAdmin.<field>` this
 * repo's schema exposes that is NOT one of the 21 A-row census's own
 * surfaces, classified with a reason. `surface.completeness.spec.ts` is the
 * ONLY consumer — it asserts every schema surface is either censused
 * (`A_ROW_SURFACES`) or classified (here), so a brand-new mutation added to
 * `schema.graphql` without EITHER fails loudly instead of silently falling
 * through both nets.
 *
 * Two dispositions, closed union by design (adding a third is a decision,
 * not a data entry). Slice A also had `inventory-read`,
 * `legacy-platform-admin` and `slice-b-deletion`; all three are empty at
 * Slice B — T074 re-gated every bare PLATFORM_ADMIN surface and censused the
 * console's list/discovery reads (`platformAdmin.*`) as `declarationOnly`
 * A-row entries, and T078/T079 deleted the platform-settings and Wingback
 * surfaces.
 *  - `non-admin` — an ordinary, owner-gated or self-service surface. No
 *    A-row owns it because it isn't a platform-admin action at all: a Space
 *    member editing their own callout, a user managing their own
 *    subscriptions, a room participant sending a message. This is the
 *    overwhelming majority of the schema's mutations (140 of 162 at this
 *    writing) — the 21-row census is deliberately narrow (spec §Scale), and
 *    everything outside it is presumed non-admin unless a QA/security pass
 *    finds otherwise (as C2-a did for `createLicensePlan`, moved INTO the
 *    census rather than classified here).
 *  - `pending-ruling` — QA found a real, named gap, but the fix is a
 *    decision (which role should own this), not a mechanical change. Each
 *    entry's `reason` cites the QA finding key that has the options.
 */

export type NonAdminDisposition = 'non-admin' | 'pending-ruling';

export interface NonAdminClassification {
  readonly disposition: NonAdminDisposition;
  readonly reason: string;
}

/** Shared reason for the bulk `non-admin` bucket — every key using it is an
 * ordinary domain mutation gated by the resource's OWN authorization policy
 * (Space/Callout/Organization/User/Conversation/…), never the platform
 * policy, and appears nowhere in any A-row's spec §Action → owning role. */
const NON_ADMIN: NonAdminClassification = {
  disposition: 'non-admin',
  reason:
    'Ordinary owner-gated or self-service domain mutation, gated by the resource’s own authorization policy — no A-row owns it; not a platform-admin action.',
};

export const NON_ADMIN_SURFACES: Readonly<
  Record<string, NonAdminClassification>
> = {
  // ===== pending-ruling (5) — real, named gaps; the fix is a decision =====
  // QA server-C1-12 / server-C2-d were RULED (2026-09-25) and moved INTO the
  // census: `createInnovationHub` (A12, Platform License Manager) and
  // `eventOnOrganizationVerification` (A6, Platform Support).
  deletePlatformInvitation: {
    disposition: 'pending-ruling',
    reason:
      'QA finding census-deletePlatformInvitation (the FR-007(e) class): ' +
      'bare DELETE against the PlatformInvitation’s own policy, reachable ' +
      'by platform-content-full-access through the root CRUD cascade — the ' +
      'same shape as the accepted A6/A7/A8 exceptions, but this surface is ' +
      'not one of those three families, so the reach is not yet ruled on. ' +
      'This finding had no pre-existing key in the QA handover — ' +
      '`census-deletePlatformInvitation` is the new one it was given.',
  },
  createUser: {
    disposition: 'pending-ruling',
    reason:
      'QA finding census-createUser (the FR-007(e) class, round-2 fix): ' +
      'registration.resolver.mutations.ts gates `createUser` on bare CREATE ' +
      'against the platform authorization policy — reachable by ' +
      'platform-content-full-access through the root CRUD cascade, the same ' +
      'shape as `deletePlatformInvitation` above. Not one of the accepted ' +
      'A6/A7/A8 dual-path exceptions, so the reach is not yet ruled on.',
  },
  aiServerCreateAiPersona: {
    disposition: 'pending-ruling',
    reason:
      'QA finding census-aiServerAiPersona (round-2 fix): an uncensused A11 ' +
      'surface, not a non-admin one. Create is granted to ' +
      'PLATFORM_OPERATIONS_ADMIN via CREDENTIAL_RULE_AI_SERVER_PERSONA_CREATE ' +
      'on the aiServer authorization policy (ai.server.service.authorization.ts) ' +
      '— the same family A11 already owns via `updateAssistantActorCapabilities` ' +
      '— but has no census entry of its own. Fix once ruled: census into A11 ' +
      '(mirror + invocation + mirror-integrity count).',
  },
  aiServerUpdateAiPersona: {
    disposition: 'pending-ruling',
    reason:
      'QA finding census-aiServerAiPersona (round-2 fix): gated on the ' +
      'AiPersona’s own authorization policy, which inherits ONLY the ' +
      'GLOBAL_ADMIN credential rule from aiServer.authorization (the ' +
      'PLATFORM_OPERATIONS_ADMIN create rule has cascade:false) — so only ' +
      'GLOBAL_ADMIN can reach it. No Slice B role owns update/delete on an ' +
      'AI persona; not yet ruled on.',
  },
  aiServerDeleteAiPersona: {
    disposition: 'pending-ruling',
    reason:
      'QA finding census-aiServerAiPersona (round-2 fix): gated on the ' +
      'AiPersona’s own authorization policy, which inherits ONLY the ' +
      'GLOBAL_ADMIN credential rule from aiServer.authorization (the ' +
      'PLATFORM_OPERATIONS_ADMIN create rule has cascade:false) — so only ' +
      'GLOBAL_ADMIN can reach it. No Slice B role owns update/delete on an ' +
      'AI persona; not yet ruled on.',
  },

  // ===== non-admin (140) — ordinary, owner-gated or self-service mutations =====
  addClassificationEntryFromTemplate: NON_ADMIN,
  addPollOption: NON_ADMIN,
  addReactionToCallout: NON_ADMIN,
  addReactionToMessageInRoom: NON_ADMIN,
  addVisualToMediaGallery: NON_ADMIN,
  applyForEntryRoleOnRoleSet: NON_ADMIN,
  assignConversationMember: NON_ADMIN,
  assignRole: NON_ADMIN,
  assignRoleToOrganization: NON_ADMIN,
  assignRoleToUser: NON_ADMIN,
  assignRoleToVirtualContributor: NON_ADMIN,
  assignUserToGroup: NON_ADMIN,
  castPollVote: NON_ADMIN,
  continueMemoSigning: NON_ADMIN,
  createCalloutOnCalloutsSet: NON_ADMIN,
  createClassificationEntry: NON_ADMIN,
  createContributionOnCallout: NON_ADMIN,
  createConversation: NON_ADMIN,
  createEventOnCalendar: NON_ADMIN,
  createGroupOnCommunity: NON_ADMIN,
  createGroupOnOrganization: NON_ADMIN,
  createInnovationPack: NON_ADMIN,
  createReferenceOnProfile: NON_ADMIN,
  createSpace: NON_ADMIN,
  createStateOnInnovationFlow: NON_ADMIN,
  createSubspace: NON_ADMIN,
  createTagsetOnProfile: NON_ADMIN,
  createTaskColumnOnCallout: NON_ADMIN,
  createVirtualContributor: NON_ADMIN,
  createWhiteboardDraftOnCalloutsSet: NON_ADMIN,
  createWhiteboardDraftOnTemplatesSet: NON_ADMIN,
  deleteApplication: NON_ADMIN,
  deleteCalendarEvent: NON_ADMIN,
  deleteClassificationEntry: NON_ADMIN,
  deleteCollaboraDocument: NON_ADMIN,
  deleteConversation: NON_ADMIN,
  deleteDocument: NON_ADMIN,
  deleteInvitation: NON_ADMIN,
  deleteLink: NON_ADMIN,
  deleteMemo: NON_ADMIN,
  deletePost: NON_ADMIN,
  deleteReference: NON_ADMIN,
  deleteStateOnInnovationFlow: NON_ADMIN,
  deleteStorageBucket: NON_ADMIN,
  deleteTaskColumnOnCallout: NON_ADMIN,
  deleteUserGroup: NON_ADMIN,
  deleteVirtualContributor: NON_ADMIN,
  deleteVisualFromMediaGallery: NON_ADMIN,
  deleteWhiteboard: NON_ADMIN,
  deleteWhiteboardDraft: NON_ADMIN,
  enablePushSubscription: NON_ADMIN,
  eventOnApplication: NON_ADMIN,
  eventOnInvitation: NON_ADMIN,
  importCollaboraDocument: NON_ADMIN,
  inviteForEntryRoleOnRoleSet: NON_ADMIN,
  joinRoleSet: NON_ADMIN,
  leaveConversation: NON_ADMIN,
  markMessageAsReadInRoom: NON_ADMIN,
  markNotificationsAsRead: NON_ADMIN,
  markNotificationsAsUnread: NON_ADMIN,
  mintMcpApiKey: NON_ADMIN,
  moveTaskToColumn: NON_ADMIN,
  prepareMemoSigning: NON_ADMIN,
  refreshVirtualContributorBodyOfKnowledge: NON_ADMIN,
  removeCommunityGuidelinesContent: NON_ADMIN,
  removeConversationMember: NON_ADMIN,
  removeDefaultCalloutTemplateOnInnovationFlowState: NON_ADMIN,
  removeMessageOnRoom: NON_ADMIN,
  removePollOption: NON_ADMIN,
  removePollVote: NON_ADMIN,
  removeReactionFromCallout: NON_ADMIN,
  removeReactionToMessageInRoom: NON_ADMIN,
  removeRole: NON_ADMIN,
  removeRoleFromOrganization: NON_ADMIN,
  removeRoleFromUser: NON_ADMIN,
  removeRoleFromVirtualContributor: NON_ADMIN,
  removeUserFromGroup: NON_ADMIN,
  reorderPollOptions: NON_ADMIN,
  replaceCollaboraDocument: NON_ADMIN,
  replaceWhiteboardContentFromSource: NON_ADMIN,
  resendPlatformInvitation: NON_ADMIN,
  resetConversationVc: NON_ADMIN,
  revokeMcpApiKey: NON_ADMIN,
  sendDirectMessageToUsers: NON_ADMIN,
  sendMessageReplyToRoom: NON_ADMIN,
  sendMessageToCommunityLeads: NON_ADMIN,
  sendMessageToOrganization: NON_ADMIN,
  sendMessageToRoom: NON_ADMIN,
  sendMessageToUsers: NON_ADMIN,
  setDefaultCalloutTemplateOnInnovationFlowState: NON_ADMIN,
  subscribeToPushNotifications: NON_ADMIN,
  unsubscribeFromPushNotifications: NON_ADMIN,
  updateApplicationFormOnRoleSet: NON_ADMIN,
  updateCalendarEvent: NON_ADMIN,
  updateCalloutVisibility: NON_ADMIN,
  updateCalloutsSortOrder: NON_ADMIN,
  updateClassificationEntry: NON_ADMIN,
  updateClassificationEntryDisplay: NON_ADMIN,
  updateClassificationEntrySelection: NON_ADMIN,
  updateClassificationTagset: NON_ADMIN,
  updateCollaboraDocument: NON_ADMIN,
  updateCollaborationFromSpaceTemplate: NON_ADMIN,
  updateCommunityGuidelines: NON_ADMIN,
  updateContributionsSortOrder: NON_ADMIN,
  updateConversation: NON_ADMIN,
  updateDocument: NON_ADMIN,
  updateInnovationFlow: NON_ADMIN,
  updateInnovationFlowCurrentState: NON_ADMIN,
  updateInnovationFlowState: NON_ADMIN,
  updateInnovationFlowStatesSortOrder: NON_ADMIN,
  updateLink: NON_ADMIN,
  updateMemo: NON_ADMIN,
  updateNotificationState: NON_ADMIN,
  updateOrganization: NON_ADMIN,
  updateOrganizationSettings: NON_ADMIN,
  updatePollOption: NON_ADMIN,
  updatePollStatus: NON_ADMIN,
  updatePost: NON_ADMIN,
  updateProfile: NON_ADMIN,
  updateReference: NON_ADMIN,
  updateSpace: NON_ADMIN,
  updateSpaceSettings: NON_ADMIN,
  updateSubspacePinned: NON_ADMIN,
  updateSubspacesSortOrder: NON_ADMIN,
  updateTagset: NON_ADMIN,
  updateTaskColumnOnCallout: NON_ADMIN,
  updateTaskColumnsSortOrderOnCallout: NON_ADMIN,
  updateTemplateContentSpace: NON_ADMIN,
  updateTemplateDefault: NON_ADMIN,
  updateUserGroup: NON_ADMIN,
  updateUserSettings: NON_ADMIN,
  updateVirtualContributor: NON_ADMIN,
  updateVirtualContributorSettings: NON_ADMIN,
  updateVisual: NON_ADMIN,
  updateWhiteboard: NON_ADMIN,
  updateWhiteboardGuestAccess: NON_ADMIN,
  uploadFileOnLink: NON_ADMIN,
  uploadFileOnReference: NON_ADMIN,
  uploadFileOnStorageBucket: NON_ADMIN,
  uploadImageOnVisual: NON_ADMIN,
};
