import { RoomType } from '@common/enums/room.type';
import {
  isConversationKind,
  isCountedDisposition,
  resolveDisposition,
} from './proxy.surface.disposition';
import {
  COUNTED_PROXY_SURFACE_IDS,
  getProxySurfaceEntry,
  PROXY_SURFACE_INVENTORY,
} from './proxy.surface.inventory';
import { hasAttachments } from './proxy.surface.media';

describe('PROXY_SURFACE_INVENTORY', () => {
  it('has unique identifiers', () => {
    const ids = PROXY_SURFACE_INVENTORY.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('freezes the counted surface ids (the ledger labels)', () => {
    expect([...COUNTED_PROXY_SURFACE_IDS].sort()).toMatchInlineSnapshot(`
      [
        "Conversation.storageBucket",
        "Message.attachments",
        "Mutation.addReactionToMessageInRoom",
        "Mutation.markMessageAsReadInRoom",
        "Mutation.removeMessageOnRoom",
        "Mutation.removeReactionToMessageInRoom",
        "Mutation.sendDirectMessageToUsers",
        "Mutation.sendMessageReplyToRoom",
        "Mutation.sendMessageToRoom",
        "Room.lastMessage",
        "Room.messages",
        "Room.unreadCount",
        "Room.unreadCounts",
        "Subscription.conversationEvents",
        "Subscription.roomEvents",
      ]
    `);
  });

  it('gives every entry exactly one of: disposition, dispositionByRoomKind, carrier', () => {
    for (const entry of PROXY_SURFACE_INVENTORY) {
      const ways = [
        entry.disposition !== undefined,
        entry.dispositionByRoomKind !== undefined,
        entry.carrier === true,
      ].filter(Boolean).length;
      expect(ways, entry.id).toBe(1);
    }
  });

  it('marks counted exactly when some resolved disposition is not retained', () => {
    for (const entry of PROXY_SURFACE_INVENTORY) {
      if (entry.kind === 'LOADER') continue;
      const resolved = [
        resolveDisposition(entry, RoomType.CONVERSATION_DIRECT),
        resolveDisposition(entry, RoomType.CALLOUT),
      ];
      const anyCounted = resolved.some(isCountedDisposition);
      expect(entry.counted, entry.id).toBe(anyCounted);
    }
  });

  it('names a replacement on every migrated row', () => {
    for (const entry of PROXY_SURFACE_INVENTORY) {
      const migrated =
        entry.disposition === 'MIGRATED_BROWSER_DATA_PLANE' ||
        entry.dispositionByRoomKind?.conversation ===
          'MIGRATED_BROWSER_DATA_PLANE';
      if (migrated) {
        expect(entry.replacement, entry.id).toBeTruthy();
      }
    }
  });

  it('classifies the media-seam surfaces as pending on the media branch', () => {
    for (const id of ['Message.attachments', 'Conversation.storageBucket']) {
      const entry = getProxySurfaceEntry(id);
      expect(entry?.disposition).toBe('RETAINED_MEDIA_SEAM');
      expect(entry?.pendingBranch).toBe('feat/013-matrix-media-file-service');
    }
  });
});

describe('resolveDisposition', () => {
  const send = getProxySurfaceEntry('Mutation.sendMessageToRoom')!;

  it('treats the three conversation room kinds as conversation kinds', () => {
    expect(isConversationKind(RoomType.CONVERSATION)).toBe(true);
    expect(isConversationKind(RoomType.CONVERSATION_DIRECT)).toBe(true);
    expect(isConversationKind(RoomType.CONVERSATION_GROUP)).toBe(true);
    for (const other of [
      RoomType.CALLOUT,
      RoomType.POST,
      RoomType.CALENDAR_EVENT,
      RoomType.DISCUSSION_FORUM,
      RoomType.UPDATES,
    ]) {
      expect(isConversationKind(other)).toBe(false);
    }
    expect(isConversationKind(undefined)).toBe(false);
  });

  it('resolves shared surfaces by room kind', () => {
    expect(resolveDisposition(send, RoomType.CONVERSATION_DIRECT)).toBe(
      'MIGRATED_BROWSER_DATA_PLANE'
    );
    expect(resolveDisposition(send, RoomType.CALLOUT)).toBe(
      'LATER_MATRIX_ROOM_SCOPE'
    );
  });

  it('resolves a send carrying attachments as the media seam regardless of room kind', () => {
    expect(resolveDisposition(send, RoomType.CONVERSATION_DIRECT, true)).toBe(
      'RETAINED_MEDIA_SEAM'
    );
    expect(resolveDisposition(send, RoomType.CALLOUT, true)).toBe(
      'RETAINED_MEDIA_SEAM'
    );
  });

  it('keeps a fixed disposition fixed and gives carriers none', () => {
    expect(
      resolveDisposition(
        getProxySurfaceEntry('Mutation.createConversation')!,
        RoomType.CONVERSATION_DIRECT
      )
    ).toBe('RETAINED_CONTROL_PLANE');
    expect(
      resolveDisposition(getProxySurfaceEntry('Message.message')!)
    ).toBeUndefined();
  });

  it('counts only non-retained dispositions', () => {
    expect(isCountedDisposition('RETAINED_CONTROL_PLANE')).toBe(false);
    expect(isCountedDisposition('RETAINED_BACKEND_INTEGRATION')).toBe(false);
    expect(isCountedDisposition('MIGRATED_BROWSER_DATA_PLANE')).toBe(true);
    expect(isCountedDisposition('LATER_MATRIX_ROOM_SCOPE')).toBe(true);
    expect(isCountedDisposition('RETAINED_MEDIA_SEAM')).toBe(true);
    expect(isCountedDisposition(undefined)).toBe(false);
  });
});

describe('hasAttachments', () => {
  it('is false for the current send and reply inputs (no attachments field yet)', () => {
    expect(hasAttachments({ roomID: 'r', message: 'hi' })).toBe(false);
    expect(hasAttachments(undefined)).toBe(false);
  });

  it('is true once an input carries a non-empty attachments array', () => {
    expect(hasAttachments({ attachments: [{ id: 'a' }] })).toBe(true);
    expect(hasAttachments({ attachments: [] })).toBe(false);
  });
});
