export enum MessagingQueue {
  VIRTUAL_ENGINE_GUIDANCE = 'virtual-contributor-engine-guidance',
  VIRTUAL_ENGINE_COMMUNITY_MANAGER = 'virtual-contributor-engine-community-manager',
  VIRTUAL_ENGINE_EXPERT = 'virtual-contributor-engine-expert',
  VIRTUAL_ENGINE_GENERIC = 'virtual-contributor-engine-generic',
  VIRTUAL_ENGINE_OPENAI_ASSISTANT = 'virtual-contributor-engine-openai-assistant',
  //
  NOTIFICATIONS = 'alkemio-notifications',
  MATRIX_ADAPTER = 'alkemio-matrix-adapter',
  //
  AUTH_RESET = 'alkemio-auth-reset',
  //
  KRATOS_EVENTS = 'alkemio-kratos-events',
  //
  SUBSCRIPTION_WHITEBOARD_CONTENT = 'alkemio-subscriptions-whiteboard-content',
  SUBSCRIPTION_VIRTUAL_UPDATED = 'alkemio-subscriptions-virtual-contributor-updated',
  SUBSCRIPTION_WHITEBOARD_SAVED = 'alkemio-subscriptions-whiteboard-saved',
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL = 'alkemio-subscriptions-profile-verified-credential',
  SUBSCRIPTION_CALLOUT_POST_CREATED = 'alkemio-subscriptions-callout-post-created',
  SUBSCRIPTION_DISCUSSION_UPDATED = 'alkemio-subscriptions-discussion-updated',
  SUBSCRIPTION_SUBSPACE_CREATED = 'alkemio-subscriptions-subspace-created',
  SUBSCRIPTION_ACTIVITY_CREATED = 'alkemio-subscriptions-activity-created',
  SUBSCRIPTION_ROOM_EVENT = 'alkemio-subscriptions-room-event',
  SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED = 'alkemio-subscriptions-in-app-notification-received',
  SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER = 'alkemio-subscriptions-in-app-notification-counter',
  SUBSCRIPTION_CONVERSATION_EVENTS = 'alkemio-subscriptions-conversation-events',
  SUBSCRIPTION_POLL_VOTE_UPDATED = 'alkemio-subscriptions-poll-vote-updated',
  SUBSCRIPTION_POLL_OPTIONS_CHANGED = 'alkemio-subscriptions-poll-options-changed',
  //
  WHITEBOARDS = 'alkemio-whiteboards',
  // Server -> collaboration service: external content-update notifications so an
  // open Excalidraw room reloads from the DB after a direct (e.g. MCP) write.
  // Dedicated queue consumed ONLY by the collaboration service — must NOT reuse
  // WHITEBOARDS (the server itself consumes that one).
  WHITEBOARD_COLLABORATION = 'alkemio-whiteboard-collaboration',
  FILES = 'alkemio-files',
  IN_APP_NOTIFICATIONS = 'alkemio-in-app-notifications',
  PUSH_NOTIFICATIONS = 'alkemio-push-notifications',
  COLLABORATION_DOCUMENT_SERVICE = 'collaboration-document-service',
  // Unified collaboration-service RPC responder queue (memo + whiteboard): the
  // server CONSUMES the unified `collaboration-save` / `collaboration-fetch` RPC
  // handlers + the `collaboration-contribution` event here. (The `-delete` / `-info`
  // RPCs were retired as producerless — the server owns document deletion and emits
  // `document.deleted`, and authz is owned by the authzeval path.) It does NOT carry
  // the server -> collab lifecycle events — those go on the dedicated
  // COLLABORATION_LIFECYCLE queue, so a `document.deleted` is never delivered back to
  // the server's own responder. At cutover this replaces
  // COLLABORATION_DOCUMENT_SERVICE + WHITEBOARDS.
  COLLABORATION_SERVICE = 'alkemio-collaboration',
  // Dedicated, durable server -> collaboration-service lifecycle queue. Carries
  // owner-driven `document.deleted` (FR-006/FR-023), published and confirmed
  // before deletion begins. Consumed
  // ONLY by the collaboration service — MUST NOT reuse COLLABORATION_SERVICE
  // (that is the server's own responder queue). Cross-repo contract: the collab
  // consumer binds this exact name.
  COLLABORATION_LIFECYCLE = 'alkemio-collaboration-lifecycle',
}
