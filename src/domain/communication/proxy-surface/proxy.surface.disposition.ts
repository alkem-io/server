import { RoomType } from '@common/enums/room.type';

/**
 * Where a message-related API surface ends up as browsers move to reading
 * the messaging backend directly.
 * - RETAINED_CONTROL_PLANE: governance, lookups, operator tooling — stays.
 * - RETAINED_BACKEND_INTEGRATION: server ↔ adapter integration — stays.
 * - MIGRATED_BROWSER_DATA_PLANE: replaced for browsers by direct backend
 *   access; a retirement candidate once no web traffic remains.
 * - LATER_MATRIX_ROOM_SCOPE: the same surface serving non-conversation rooms
 *   (comments, updates, forum, calendar), which migrate in a later scope.
 * - RETAINED_MEDIA_SEAM: attachment handling that stays server-mediated.
 */
export type ProxySurfaceDisposition =
  | 'RETAINED_CONTROL_PLANE'
  | 'RETAINED_BACKEND_INTEGRATION'
  | 'MIGRATED_BROWSER_DATA_PLANE'
  | 'LATER_MATRIX_ROOM_SCOPE'
  | 'RETAINED_MEDIA_SEAM';

export const RETAINED_DISPOSITIONS: ReadonlySet<ProxySurfaceDisposition> =
  new Set(['RETAINED_CONTROL_PLANE', 'RETAINED_BACKEND_INTEGRATION']);

export type ProxySurfaceKind =
  | 'QUERY_FIELD'
  | 'MUTATION'
  | 'SUBSCRIPTION'
  | 'OBJECT_FIELD'
  | 'LOADER'
  | 'INTEGRATION';

export interface ProxySurfaceEntry {
  /** Frozen identifier, e.g. 'Mutation.sendMessageToRoom', 'Room.messages'. */
  id: string;
  kind: ProxySurfaceKind;
  /** Fixed disposition, independent of the room kind. */
  disposition?: ProxySurfaceDisposition;
  /** Shared surfaces: disposition depends on the room kind served. */
  dispositionByRoomKind?: {
    conversation: ProxySurfaceDisposition;
    other: ProxySurfaceDisposition;
  };
  /**
   * Fields of a type that only travels inside another surface (a message
   * inside Room.messages, a reaction inside a message): the disposition is
   * the carrier's and the carrier is what gets counted.
   */
  carrier?: true;
  /** Per-call override: a call carrying attachments is the media seam. */
  mediaSeamWhen?: 'attachments';
  /** true ⇔ the resolved disposition is not a retained one (for any room kind). */
  counted: boolean;
  /** What a migrated row is replaced by. */
  replacement?: string;
  /** Surface not on the integration branch yet; exempt from the schema check. */
  pendingBranch?: string;
}

export const CONVERSATION_ROOM_TYPES: ReadonlySet<RoomType> = new Set([
  RoomType.CONVERSATION,
  RoomType.CONVERSATION_DIRECT,
  RoomType.CONVERSATION_GROUP,
]);

export const isConversationKind = (
  roomType: RoomType | string | undefined
): boolean =>
  roomType !== undefined && CONVERSATION_ROOM_TYPES.has(roomType as RoomType);

/**
 * Resolve the disposition of a call on a surface once the room kind and the
 * media flag are known. Carrier entries have no disposition of their own.
 */
export const resolveDisposition = (
  entry: ProxySurfaceEntry,
  roomType?: RoomType | string,
  media = false
): ProxySurfaceDisposition | undefined => {
  if (entry.carrier) return undefined;
  if (entry.mediaSeamWhen === 'attachments' && media) {
    return 'RETAINED_MEDIA_SEAM';
  }
  if (entry.dispositionByRoomKind) {
    return isConversationKind(roomType)
      ? entry.dispositionByRoomKind.conversation
      : entry.dispositionByRoomKind.other;
  }
  return entry.disposition;
};

/** Whether a call on the surface is counted by the usage ledger. */
export const isCountedDisposition = (
  disposition: ProxySurfaceDisposition | undefined
): boolean =>
  disposition !== undefined && !RETAINED_DISPOSITIONS.has(disposition);
