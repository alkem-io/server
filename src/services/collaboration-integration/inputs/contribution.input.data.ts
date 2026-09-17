import { CollaborationContentType } from '../types';

/** A contributing actor id (frozen contract `User { id }`). */
export interface CollaborationContributionUser {
  id: string;
}

/**
 * `collaboration-contribution` fire-and-forget event payload (frozen contract
 * `ContributionData`): the per-window set of contributing actors, unified under
 * a single `id` (carried forward from the legacy
 * `collaboration-memo-contribution { memoId, users }` and whiteboard
 * `contribution { whiteboardId, users }`).
 *
 * The contract omits `contentType`; the server resolves memo-vs-whiteboard from
 * the id when reporting. `contentType` is accepted if the collab service starts
 * sending it, but is optional.
 */
export interface ContributionInputData {
  id: string;
  users: CollaborationContributionUser[];
  contentType?: CollaborationContentType;
}
