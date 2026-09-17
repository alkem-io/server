export const SUBSCRIPTION_DISCUSSION_UPDATED =
  'alkemio-subscriptions-discussion-updated';
export const SUBSCRIPTION_VIRTUAL_UPDATED =
  'alkemio-subscriptions-vritual-contributor-updated';
export const SUBSCRIPTION_CALLOUT_POST_CREATED =
  'alkemio-subscriptions-callout-post-created';
export const SUBSCRIPTION_SUBSPACE_CREATED =
  'alkemio-subscriptions-subspace-created';
export const SUBSCRIPTION_ACTIVITY_CREATED =
  'alkemio-subscriptions-activity-created';
export const SUBSCRIPTION_IN_APP_NOTIFICATION_RECEIVED =
  'alkemio-subscriptions-notification-received';
export const SUBSCRIPTION_IN_APP_NOTIFICATION_COUNTER =
  'alkemio-subscriptions-notification-counter';
export const AUTH_RESET_SERVICE = 'alkemio-auth-reset';
export const WHITEBOARD_COLLABORATION_SERVICE =
  'alkemio-whiteboard-collaboration';
export const NOTIFICATIONS_SERVICE = 'alkemio-notifications';
export const MATRIX_ADAPTER_SERVICE = 'alkemio-matrix-adapter';
// Outbound client token for the unified collaboration-service RPC responder
// queue: the same queue hosts the inbound unified `collaboration-*`
// @MessagePattern handlers the server itself consumes. It does NOT carry the
// server -> collab lifecycle events — those go on COLLABORATION_LIFECYCLE_SERVICE.
export const COLLABORATION_SERVICE = 'alkemio-collaboration';
// Outbound client token for the dedicated, durable server -> collaboration
// lifecycle queue. Carries owner-driven `document.deleted` (FR-006/FR-023),
// published and confirmed before deletion begins. Separate from
// COLLABORATION_SERVICE so a lifecycle event is never
// delivered back to the server's own responder.
export const COLLABORATION_LIFECYCLE_SERVICE =
  'alkemio-collaboration-lifecycle';
export const SUBSCRIPTION_ROOM_EVENT = 'alkemio-subscriptions-room-event';
export const SUBSCRIPTION_CONVERSATION_EVENT =
  'alkemio-subscriptions-conversation-event';
export const SUBSCRIPTION_POLL_VOTE_UPDATED =
  'alkemio-subscriptions-poll-vote-updated';
export const SUBSCRIPTION_POLL_OPTIONS_CHANGED =
  'alkemio-subscriptions-poll-options-changed';
export const ELASTICSEARCH_CLIENT_PROVIDER = 'elasticsearch-client-provider';
export const APP_ID = 'app-id';
export const IS_SCHEMA_BOOTSTRAP = 'is-schema-bootstrap';
