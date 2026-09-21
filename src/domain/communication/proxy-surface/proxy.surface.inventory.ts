import { ProxySurfaceEntry } from './proxy.surface.disposition';

const RCP = 'RETAINED_CONTROL_PLANE' as const;
const MBD = 'MIGRATED_BROWSER_DATA_PLANE' as const;
const LMS = 'LATER_MATRIX_ROOM_SCOPE' as const;
const RMS = 'RETAINED_MEDIA_SEAM' as const;

/**
 * Every message-related API surface, classified. Identifiers are frozen —
 * they are the labels in the usage ledger and the rows of the published
 * inventory, which is why every row is spelled out literally rather than
 * generated: the workspace inventory is checked against this file by
 * grepping for `id: '<surface>'`.
 *
 * Shared surfaces (one mutation or field serving all eight room kinds) carry a
 * disposition per room kind: conversation rooms migrate to direct backend
 * access; every other room kind is later scope, so the field itself stays.
 * Carrier types (a message inside Room.messages, a reaction inside a message)
 * take the disposition of the surface that carries them and are never counted
 * themselves. The contract test derives the set of message-related schema
 * surfaces and fails on any surface missing here.
 */
export const PROXY_SURFACE_INVENTORY: readonly ProxySurfaceEntry[] = [
  // ---- proxy write path: one mutation per operation, all eight room kinds
  {
    id: 'Mutation.sendMessageToRoom',
    kind: 'MUTATION',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    mediaSeamWhen: 'attachments',
    counted: true,
    replacement: 'direct backend send from the browser',
  },
  {
    id: 'Mutation.sendMessageReplyToRoom',
    kind: 'MUTATION',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    mediaSeamWhen: 'attachments',
    counted: true,
    replacement: 'direct backend threaded send from the browser',
  },
  {
    id: 'Mutation.addReactionToMessageInRoom',
    kind: 'MUTATION',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    counted: true,
    replacement: 'direct backend reaction from the browser',
  },
  {
    id: 'Mutation.removeReactionToMessageInRoom',
    kind: 'MUTATION',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    counted: true,
    replacement: 'direct backend redaction of the own reaction',
  },
  {
    id: 'Mutation.removeMessageOnRoom',
    kind: 'MUTATION',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    counted: true,
    replacement:
      'direct backend redaction; moderation stays server-side until backend power levels reflect platform admins',
  },
  {
    id: 'Mutation.markMessageAsReadInRoom',
    kind: 'MUTATION',
    disposition: MBD,
    counted: true,
    replacement: 'backend read receipt sent by the browser',
  },
  {
    id: 'Mutation.sendDirectMessageToUsers',
    kind: 'MUTATION',
    disposition: MBD,
    counted: true,
    replacement: 'resolveDirectConversations followed by a direct backend send',
  },

  // ---- email transports (no room involved)
  {
    id: 'Mutation.sendMessageToUsers',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.sendMessageToOrganization',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.sendMessageToCommunityLeads',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },

  // ---- conversation governance
  {
    id: 'Mutation.createConversation',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.resolveDirectConversations',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.assignConversationMember',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.removeConversationMember',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.leaveConversation',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.updateConversation',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.deleteConversation',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.resetConversationVc',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.repairConversationRoom',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },

  // ---- operator tooling
  {
    id: 'Mutation.adminCommunicationEnsureAccessToCommunications',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.adminCommunicationRemoveOrphanedRoom',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.adminCommunicationUpdateRoomState',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.adminCommunicationSyncSpaceHierarchy',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.adminCommunicationReconcileForumHierarchy',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.adminCommunicationReconcileConversationRooms',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Mutation.adminCommunicationMigrateOrphanedConversations',
    kind: 'MUTATION',
    disposition: RCP,
    counted: false,
    replacement:
      'adminCommunicationReconcileConversationRooms (deprecated: dead since every conversation carries a room)',
  },

  // ---- lookups and operator reads
  {
    id: 'Query.lookup.conversation',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.lookup.room',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.me.conversations',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.me.conversations.conversations',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.platform.messaging',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.platformAdmin.communication.adminCommunicationMembership',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.platformAdmin.communication.adminCommunicationOrphanedUsage',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Query.platformAdmin.communication.proxySurfaceUsage',
    kind: 'QUERY_FIELD',
    disposition: RCP,
    counted: false,
  },
  { id: 'Query.task', kind: 'QUERY_FIELD', disposition: RCP, counted: false },

  // ---- Conversation
  {
    id: 'Conversation.room',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.members',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.authorization',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.messaging',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.createdDate',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.updatedDate',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.id',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Conversation.storageBucket',
    kind: 'OBJECT_FIELD',
    disposition: RMS,
    counted: true,
    pendingBranch: 'feat/013-matrix-media-file-service',
  },

  // ---- Room
  {
    id: 'Room.readiness',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Room.messages',
    kind: 'OBJECT_FIELD',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    counted: true,
    replacement: 'backend sync and pagination in the browser',
  },
  {
    id: 'Room.lastMessage',
    kind: 'OBJECT_FIELD',
    disposition: MBD,
    counted: true,
    replacement: 'backend room state read by the browser',
  },
  {
    id: 'Room.unreadCount',
    kind: 'OBJECT_FIELD',
    disposition: MBD,
    counted: true,
    replacement: 'backend unread counts read by the browser',
  },
  {
    id: 'Room.unreadCounts',
    kind: 'OBJECT_FIELD',
    disposition: MBD,
    counted: true,
    replacement: 'backend thread unread counts read by the browser',
  },
  {
    id: 'Room.messagesCount',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  { id: 'Room.type', kind: 'OBJECT_FIELD', disposition: RCP, counted: false },
  {
    id: 'Room.displayName',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Room.avatarUrl',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Room.createdDate',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Room.updatedDate',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Room.authorization',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  { id: 'Room.id', kind: 'OBJECT_FIELD', disposition: RCP, counted: false },
  {
    id: 'Room.vcInteractions',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },

  // ---- carrier types: disposition follows the surface that carries them
  { id: 'Message.id', kind: 'OBJECT_FIELD', carrier: true, counted: false },
  {
    id: 'Message.message',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'Message.timestamp',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'Message.threadID',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'Message.reactions',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  { id: 'Message.sender', kind: 'OBJECT_FIELD', carrier: true, counted: false },
  {
    id: 'Message.attachments',
    kind: 'OBJECT_FIELD',
    disposition: RMS,
    counted: true,
    pendingBranch: 'feat/013-matrix-media-file-service',
  },
  { id: 'Reaction.emoji', kind: 'OBJECT_FIELD', carrier: true, counted: false },
  { id: 'Reaction.id', kind: 'OBJECT_FIELD', carrier: true, counted: false },
  {
    id: 'Reaction.sender',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'Reaction.timestamp',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'RoomUnreadCounts.roomUnreadCount',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'RoomUnreadCounts.threadUnreadCounts',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.eventType',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.conversationCreated',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.conversationUpdated',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.conversationDeleted',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.memberAdded',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.memberRemoved',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.messageReceived',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.messageRemoved',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },
  {
    id: 'ConversationEventSubscriptionResult.readReceiptUpdated',
    kind: 'OBJECT_FIELD',
    carrier: true,
    counted: false,
  },

  // ---- non-proxy object fields
  {
    id: 'VcInteraction.threadID',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'VcInteraction.virtualContributorID',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ConversationGovernanceEvent.eventType',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ConversationGovernanceEvent.conversationID',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ConversationGovernanceEvent.conversation',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ConversationGovernanceEvent.member',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ConversationGovernanceEvent.memberID',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ConversationGovernanceEvent.readiness',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'MessageDetails.room',
    kind: 'OBJECT_FIELD',
    disposition: RCP,
    counted: false,
  },

  // ---- subscriptions
  {
    id: 'Subscription.roomEvents',
    kind: 'SUBSCRIPTION',
    dispositionByRoomKind: { conversation: MBD, other: LMS },
    counted: true,
    replacement: 'backend sync in the browser',
  },
  {
    id: 'Subscription.conversationEvents',
    kind: 'SUBSCRIPTION',
    disposition: MBD,
    counted: true,
    replacement: 'conversationGovernanceEvents plus backend sync',
  },
  {
    id: 'Subscription.conversationGovernanceEvents',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.inAppNotificationReceived',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.notificationsUnreadCount',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.activityCreated',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.forumDiscussionUpdated',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.calloutPostCreated',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.subspaceCreated',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.pollVoteUpdated',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.pollOptionsChanged',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'Subscription.virtualContributorUpdated',
    kind: 'SUBSCRIPTION',
    disposition: RCP,
    counted: false,
  },

  // ---- request-scoped loaders behind the migrated fields
  {
    id: 'RoomDataLoader.lastMessageLoader',
    kind: 'LOADER',
    disposition: MBD,
    counted: false,
    replacement: 'retired with Room.lastMessage',
  },
  {
    id: 'RoomDataLoader.unreadCountLoader',
    kind: 'LOADER',
    disposition: MBD,
    counted: false,
    replacement: 'retired with Room.unreadCount',
  },
  {
    id: 'ConversationMembershipsLoaderCreator',
    kind: 'LOADER',
    disposition: RCP,
    counted: false,
  },
  {
    id: 'ContributorByAgentIdLoaderCreator',
    kind: 'LOADER',
    disposition: RCP,
    counted: false,
  },
];

const byId = new Map(PROXY_SURFACE_INVENTORY.map(entry => [entry.id, entry]));

export const getProxySurfaceEntry = (
  id: string
): ProxySurfaceEntry | undefined => byId.get(id);

/** Surface ids the ledger may count (any room kind). */
export const COUNTED_PROXY_SURFACE_IDS: readonly string[] =
  PROXY_SURFACE_INVENTORY.filter(entry => entry.counted).map(entry => entry.id);
