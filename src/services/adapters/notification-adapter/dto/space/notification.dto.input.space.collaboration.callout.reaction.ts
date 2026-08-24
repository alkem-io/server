/**
 * Input event data for a callout reaction notification.
 * Carries only the identifiers needed to resolve and emit — no content fields.
 */
export interface NotificationInputCollaborationCalloutReaction {
  /** The ID of the callout that was reacted to. */
  calloutID: string;
  /** The actor ID of the user who reacted. */
  triggeredBy: string;
  /** The emoji slug from the platform allow-list. */
  emoji: string;
}
