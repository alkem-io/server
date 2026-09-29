import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

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
 * Five dispositions, closed union by design (adding a sixth is a decision,
 * not a data entry):
 *  - `non-admin` — an ordinary, owner-gated or self-service surface. No
 *    A-row owns it because it isn't a platform-admin action at all: a Space
 *    member editing their own callout, a user managing their own
 *    subscriptions, a room participant sending a message. This is the
 *    overwhelming majority of the schema's mutations (140 of 162 at this
 *    writing) — the 21-row census is deliberately narrow (spec §Scale), and
 *    everything outside it is presumed non-admin unless a QA/security pass
 *    finds otherwise (as C2-a did for `createLicensePlan`, moved INTO the
 *    census rather than classified here).
 *  - `inventory-read` — one of F6's list/discovery reads under
 *    `platformAdmin` (`a.row.surfaces.ts`'s `INDIRECT_ENFORCEMENT_FILES`
 *    F6/R-F.2/R-F.3 commentary is the authority; this is its classification
 *    mirror, not a restatement of the reasoning).
 *  - `legacy-platform-admin` — still gated on the bare, retiring
 *    `PLATFORM_ADMIN` catch-all with no A-row and no per-family privilege
 *    yet. `reason` names the file that owns reassigning it, and that file's
 *    `PLATFORM_ADMIN_GATE_HOMES` entry (below — census check 3, QA
 *    cross-census-3) must list the member: the codebase-wide tracking of
 *    every PLATFORM_ADMIN gate lives there, not here.
 *  - `slice-b-deletion` — deleted outright at Slice B (T079), not re-gated;
 *    same disposition as the already-censused `createWingbackAccount` (A12)
 *    for the rest of the Wingback surface.
 *  - `pending-ruling` — QA found a real, named gap, but the fix is a
 *    decision (which role should own this), not a mechanical change. Each
 *    entry's `reason` cites the QA finding key that has the options.
 */

export type NonAdminDisposition =
  | 'non-admin'
  | 'inventory-read'
  | 'legacy-platform-admin'
  | 'slice-b-deletion'
  | 'pending-ruling';

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

const inventoryRead = (field: string): NonAdminClassification => ({
  disposition: 'inventory-read',
  reason:
    `F6 (a.row.surfaces.ts INDIRECT_ENFORCEMENT_FILES) — the admin console's ` +
    `${field} inventory read, not an A-row action; censusing it would multiply ` +
    'a read-only affordance into the FR-024 denial matrix and restate an ' +
    "already-censused family's intent in a second place.",
});

export const NON_ADMIN_SURFACES: Readonly<
  Record<string, NonAdminClassification>
> = {
  // ===== inventory-read (9) — F6's eight list/discovery reads + virtualAssistant (C1-13) =====
  'platformAdmin.accounts': inventoryRead('accounts'),
  'platformAdmin.identity': inventoryRead('identity'),
  'platformAdmin.innovationHubs': inventoryRead('innovationHubs'),
  'platformAdmin.innovationPacks': inventoryRead('innovationPacks'),
  'platformAdmin.organizations': inventoryRead('organizations'),
  'platformAdmin.spaces': inventoryRead('spaces'),
  'platformAdmin.users': inventoryRead('users'),
  'platformAdmin.virtualContributors': inventoryRead('virtualContributors'),
  // QA C1-13 fix: virtualAssistant is a NINTH inventory read — the read-side
  // discovery path for A11's `updateAssistantActorCapabilities` — not part
  // of F6's original eight, gated on PLATFORM_OPERATIONS_ADMIN (not the
  // per-family privileges the other eight use), same disposition regardless.
  'platformAdmin.virtualAssistant': {
    disposition: 'inventory-read',
    reason:
      "QA C1-13 fix — the read-side discovery path for A11's " +
      '`updateAssistantActorCapabilities` (`src/platform-admin/admin/' +
      'platform.admin.resolver.fields.ts`), gated on PLATFORM_OPERATIONS_ADMIN ' +
      '(replacing PLATFORM_ADMIN); legacy GA/GS/GLM holders keep access ' +
      'because they hold both. A read, not an A-row.',
  },

  // ===== legacy-platform-admin (4) — bare PLATFORM_ADMIN, no new home yet =====
  'platformAdmin.communication': {
    disposition: 'legacy-platform-admin',
    reason:
      'Bare PLATFORM_ADMIN gate, no per-family privilege yet — ' +
      'src/platform-admin/admin/platform.admin.resolver.fields.ts owns its reassignment.',
  },
  updateOrganizationPlatformSettings: {
    disposition: 'legacy-platform-admin',
    reason:
      'Bare PLATFORM_ADMIN gate against the Organization’s own policy, no ' +
      'per-family privilege yet — src/platform-admin/domain/organization/' +
      'domain.platform.settings.resolver.mutations.ts owns its reassignment.',
  },
  updateUserPlatformSettings: {
    disposition: 'legacy-platform-admin',
    reason:
      'Bare PLATFORM_ADMIN gate against the User’s own policy, no ' +
      'per-family privilege yet — src/domain/community/user/' +
      'user.resolver.mutations.ts owns its reassignment.',
  },
  updateVirtualContributorPlatformSettings: {
    disposition: 'legacy-platform-admin',
    reason:
      'Bare PLATFORM_ADMIN gate against the VirtualContributor’s own ' +
      'policy, no per-family privilege yet — src/domain/community/' +
      'virtual-contributor/virtual.contributor.resolver.mutations.ts owns its reassignment.',
  },

  // ===== slice-b-deletion (2) — Wingback, FR-021/T079 =====
  adminWingbackCreateTestCustomer: {
    disposition: 'slice-b-deletion',
    reason:
      'FR-021/T079: the whole Wingback surface is deleted at Slice B, not ' +
      're-gated — same disposition as the already-censused ' +
      '`createWingbackAccount` (A12).',
  },
  adminWingbackGetCustomerEntitlements: {
    disposition: 'slice-b-deletion',
    reason:
      'FR-021/T079: the whole Wingback surface is deleted at Slice B, not ' +
      're-gated — same disposition as the already-censused ' +
      '`createWingbackAccount` (A12).',
  },

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

  // ===== non-admin (143) — ordinary, owner-gated or self-service mutations =====
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
  createDiscussion: NON_ADMIN,
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
  deleteCalloutFormResponse: NON_ADMIN,
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
  resetConversationVc: NON_ADMIN,
  revokeMcpApiKey: NON_ADMIN,
  sendDirectMessageToUsers: NON_ADMIN,
  sendMessageReplyToRoom: NON_ADMIN,
  sendMessageToCommunityLeads: NON_ADMIN,
  sendMessageToOrganization: NON_ADMIN,
  sendMessageToRoom: NON_ADMIN,
  sendMessageToUsers: NON_ADMIN,
  setDefaultCalloutTemplateOnInnovationFlowState: NON_ADMIN,
  submitCalloutFormResponse: NON_ADMIN,
  subscribeToPushNotifications: NON_ADMIN,
  unsubscribeFromPushNotifications: NON_ADMIN,
  updateApplicationFormOnRoleSet: NON_ADMIN,
  updateCalendarEvent: NON_ADMIN,
  updateCalloutForm: NON_ADMIN,
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

/**
 * 027-platform-role-redesign (QA cross-census-3, census check 3) — where each
 * remaining `AuthorizationPrivilege.PLATFORM_ADMIN` gate GOES before T074
 * deletes the privilege. T074 (`tasks/server.md`) assumes every one of its
 * call sites was already re-gated in Slice A, so "what remains is deleting a
 * dead check"; a site that still needs a gate at that point is a Slice A
 * miss. This map makes each remaining site a DECLARED, per-member fact with
 * a concrete home, and `surface.completeness.spec.ts` checks it against the
 * code in both directions, PER MEMBER:
 *  - completeness — every declared class member whose own source segment
 *    names PLATFORM_ADMIN, in every file that is a PLATFORM_ADMIN gate site,
 *    is listed here (except the files the census itself already declares
 *    with `gate.requires === PLATFORM_ADMIN`: A1's actor credential
 *    mutations and A9's conversion mutations);
 *  - staleness — every member listed here is still DECLARED in its file and
 *    its own segment still names PLATFORM_ADMIN. A member re-gated onto
 *    another privilege while the rest of the file keeps PLATFORM_ADMIN (the
 *    C1-13 `virtualAssistant` shape) fails here instead of lingering.
 *
 * Replaces rule 1b and its hand-picked two-file `PLATFORM_ADMIN_SCAN_ALLOWLIST`
 * (`surface.drift.spec.ts`), which could not see a member-level change and
 * named a file that no longer gates on PLATFORM_ADMIN at all.
 */
export type PlatformAdminGateHome =
  /** `anyOf` union: PLATFORM_ADMIN is the retiring legacy branch beside
   * these replacement privilege(s), which must appear in the member's own
   * segment. T074 deletes the branch; the replacements carry the gate. */
  | { readonly replacedBy: readonly AuthorizationPrivilege[] }
  /** The surface itself is deleted at Slice B by this task (T078: FR-020
   * platform-settings mutations; T079: FR-021 Wingback). */
  | { readonly deletedAt: 'T078' | 'T079' }
  /** Not a gate at all: PLATFORM_ADMIN sits in a resolver-local synthetic
   * policy's PRIVILEGE SET (a legacy union), removed with the enum at T074. */
  | { readonly privilegeSetUnionDroppedAt: 'T074' }
  /** A bare PLATFORM_ADMIN gate with no replacement privilege yet — a
   * known Slice A miss, named here so T074 cannot delete it silently. The
   * string says what the gate guards. */
  | { readonly regateBeforeT074: string };

export const PLATFORM_ADMIN_GATE_HOMES: Readonly<
  Record<string, Readonly<Record<string, PlatformAdminGateHome>>>
> = {
  'src/platform/licensing/wingback-subscription/licensing.wingback.subscription.resolver.mutations.ts':
    {
      adminWingbackCreateTestCustomer: { deletedAt: 'T079' },
      adminWingbackGetCustomerEntitlements: { deletedAt: 'T079' },
    },
  'src/services/api/lookup/lookup.resolver.fields.ts': {
    authorizationPolicy: {
      regateBeforeT074:
        'lookup of an arbitrary AuthorizationPolicy row — an authorization-debugging read',
    },
    authorizationPrivilegesForUser: {
      regateBeforeT074:
        "another user's granted privileges on a policy — an authorization-debugging read",
    },
  },
  'src/services/api/roles/roles.resolver.fields.ts': {
    invitations: {
      regateBeforeT074: "another user's community invitations",
    },
    applications: {
      regateBeforeT074: "another user's community applications",
    },
  },
  'src/services/api/notification-recipients/notification.recipients.resolver.queries.ts':
    {
      notificationRecipients: {
        regateBeforeT074:
          'recipient resolution for an arbitrary notification event',
      },
    },
  'src/domain/community/virtual-contributor/virtual.contributor.resolver.queries.ts':
    {
      virtualContributors: {
        regateBeforeT074:
          'the platform-wide VirtualContributor list (non-holders get an empty list)',
      },
    },
  'src/domain/community/virtual-contributor/virtual.contributor.resolver.mutations.ts':
    {
      updateVirtualContributorPlatformSettings: {
        regateBeforeT074:
          "a VirtualContributor's platform settings (NON_ADMIN_SURFACES: legacy-platform-admin)",
      },
    },
  'src/domain/community/user/user.resolver.fields.ts': {
    authentication: {
      regateBeforeT074:
        "another user's authentication methods and timestamps (self always sees their own)",
    },
  },
  'src/domain/community/user/user.resolver.mutations.ts': {
    updateUserPlatformSettings: { deletedAt: 'T078' },
  },
  'src/domain/space/account/account.resolver.mutations.ts': {
    validateSoftLicenseLimitOrFail: {
      regateBeforeT074:
        'the bypass of the account entitlement limit on createSpace / createInnovationHub / createVirtualContributor / createInnovationPack',
    },
  },
  'src/platform-admin/admin/platform.admin.resolver.fields.ts': {
    accounts: {
      replacedBy: [AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS],
    },
    innovationHubs: {
      replacedBy: [
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ,
      ],
    },
    innovationPacks: {
      replacedBy: [
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ,
      ],
    },
    spaces: {
      replacedBy: [
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ,
      ],
    },
    users: {
      replacedBy: [
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
        AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ,
      ],
    },
    organizations: {
      replacedBy: [
        AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        AuthorizationPrivilege.PLATFORM_SUPPORT_LISTS_READ,
        AuthorizationPrivilege.PLATFORM_LICENSING_LISTS_READ,
      ],
    },
    virtualContributors: {
      replacedBy: [AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS],
    },
    // `virtualAssistant` is deliberately ABSENT: QA C1-13 re-gated it onto
    // PLATFORM_OPERATIONS_ADMIN, and the per-member stale check fails if it
    // is listed here again.
    communication: {
      regateBeforeT074:
        'the platformAdmin.communication entry point to the Matrix admin reads (NON_ADMIN_SURFACES: legacy-platform-admin)',
    },
    identity: {
      replacedBy: [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
    },
  },
  'src/platform-admin/admin/platform.admin.resolver.communication.fields.ts': {
    adminCommunicationMembership: {
      regateBeforeT074: 'Matrix room membership for a communication',
    },
    adminCommunicationOrphanedUsage: {
      regateBeforeT074: 'Matrix usage not tied to the domain model',
    },
  },
  'src/platform-admin/core/identity/admin.identity.resolver.fields.ts': {
    identities: {
      replacedBy: [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
    },
  },
  'src/platform-admin/core/identity/admin.identity.resolver.queries.ts': {
    adminIdentitiesUnverified: {
      regateBeforeT074: 'the unverified Kratos identities list',
    },
  },
  'src/platform-admin/domain/communication/admin.communication.resolver.mutations.ts':
    {
      // `as const`: a `constructor` key loses the Record's contextual type
      // (it collides with Object.prototype.constructor), widening the literal.
      constructor: { privilegeSetUnionDroppedAt: 'T074' as const },
    },
  'src/platform-admin/domain/organization/domain.platform.settings.resolver.mutations.ts':
    {
      updateOrganizationPlatformSettings: { deletedAt: 'T078' },
    },
};
