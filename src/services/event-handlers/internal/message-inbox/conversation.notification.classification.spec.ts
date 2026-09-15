import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import { describe, expect, it, vi } from 'vitest';
import { classifyConversationMessage } from './conversation.notification.classification';

describe('classifyConversationMessage (034-messaging-notifications, Ruling 2)', () => {
  it('classifies CONVERSATION_DIRECT rooms as DIRECT regardless of member count', () => {
    expect(
      classifyConversationMessage(RoomType.CONVERSATION_DIRECT, ['a', 'b'])
    ).toBe('DIRECT');
  });

  it('classifies CONVERSATION_GROUP rooms as GROUP regardless of member count', () => {
    expect(
      classifyConversationMessage(RoomType.CONVERSATION_GROUP, ['a', 'b'])
    ).toBe('GROUP');
  });

  describe('legacy RoomType.CONVERSATION — dynamic classification', () => {
    it('classifies exactly 2 members as DIRECT', () => {
      expect(
        classifyConversationMessage(RoomType.CONVERSATION, ['a', 'b'])
      ).toBe('DIRECT');
    });

    it('classifies more than 2 members as GROUP', () => {
      expect(
        classifyConversationMessage(RoomType.CONVERSATION, ['a', 'b', 'c'])
      ).toBe('GROUP');
    });

    it('returns null (skip, no recipients) for fewer than 2 members', () => {
      expect(classifyConversationMessage(RoomType.CONVERSATION, ['a'])).toBe(
        null
      );
      expect(classifyConversationMessage(RoomType.CONVERSATION, [])).toBe(null);
    });

    it('classifies an unavailable member list as GROUP via an EXPLICIT case, and logs it', () => {
      const logger = { warn: vi.fn(), error: vi.fn() };

      const result = classifyConversationMessage(
        RoomType.CONVERSATION,
        undefined,
        logger
      );

      expect(result).toBe('GROUP');
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('treats a null member list the same as unavailable (GROUP + logged)', () => {
      const logger = { warn: vi.fn(), error: vi.fn() };

      const result = classifyConversationMessage(
        RoomType.CONVERSATION,
        null,
        logger
      );

      expect(result).toBe('GROUP');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  it('returns null and logs an error for a non-conversation room type (caller-guard defense)', () => {
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = classifyConversationMessage(
      RoomType.POST,
      ['a', 'b'],
      logger
    );

    expect(result).toBe(null);
    // Winston error logging takes (message, stacktrace, context) — the log
    // context must land in the third argument, not the stacktrace slot.
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ roomType: RoomType.POST }),
      undefined,
      LogContext.COMMUNICATION_CONVERSATION
    );
  });
});
