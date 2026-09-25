import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import {
  buildSchema,
  GraphQLEnumType,
  GraphQLObjectType,
  getNamedType,
  isEnumType,
  isObjectType,
  printType,
} from 'graphql';
import path from 'path';

/**
 * The governance-only conversation channel must, by construction, be unable
 * to carry a messaging-backend room event; and the legacy mixed channel must
 * stay byte-for-byte what non-migrated browsers rely on.
 */
describe('Contract: conversation governance event channel', () => {
  const root = path.resolve(__dirname, '..');
  const schema = buildSchema(
    readFileSync(path.join(root, 'schema.graphql'), 'utf-8')
  );

  const objectType = (name: string): GraphQLObjectType => {
    const type = schema.getType(name);
    if (!isObjectType(type)) throw new Error(`${name} is not an object type`);
    return type;
  };
  const enumType = (name: string): GraphQLEnumType => {
    const type = schema.getType(name);
    if (!isEnumType(type)) throw new Error(`${name} is not an enum type`);
    return type;
  };

  describe('ConversationGovernanceEvent', () => {
    const EXPECTED_FIELDS = [
      'eventType',
      'conversationID',
      'conversation',
      'member',
      'memberID',
      'readiness',
    ].sort();
    const FORBIDDEN_TYPES = [
      'Message',
      'Reaction',
      'RoomUnreadCounts',
      'ConversationMessageReceivedEvent',
      'ConversationMessageRemovedEvent',
      'ConversationReadReceiptUpdatedEvent',
    ];
    const FORBIDDEN_NAMES = [
      'message',
      'messageReceived',
      'messageRemoved',
      'readReceiptUpdated',
      'reaction',
    ];

    it('has exactly the governance fields', () => {
      const fields = Object.keys(
        objectType('ConversationGovernanceEvent').getFields()
      ).sort();
      expect(fields).toEqual(EXPECTED_FIELDS);
    });

    it('carries no field typed as, or named like, a room event', () => {
      const fields = objectType('ConversationGovernanceEvent').getFields();
      for (const [name, field] of Object.entries(fields)) {
        const typeName = getNamedType(field.type).name;
        expect(FORBIDDEN_TYPES, `${name}: ${typeName}`).not.toContain(typeName);
        expect(FORBIDDEN_NAMES).not.toContain(name);
        expect(typeName.startsWith('ConversationMessage')).toBe(false);
        expect(typeName.startsWith('ConversationReadReceipt')).toBe(false);
      }
    });

    it('has exactly the six governance event types', () => {
      const values = enumType('ConversationGovernanceEventType')
        .getValues()
        .map(v => v.name)
        .sort();
      expect(values).toEqual(
        [
          'CONVERSATION_CREATED',
          'CONVERSATION_UPDATED',
          'CONVERSATION_DELETED',
          'MEMBER_ADDED',
          'MEMBER_REMOVED',
          'ROOM_READINESS_CHANGED',
        ].sort()
      );
    });

    it('is the payload of Subscription.conversationGovernanceEvents', () => {
      const field =
        objectType('Subscription').getFields().conversationGovernanceEvents;
      expect(field).toBeDefined();
      expect(getNamedType(field.type).name).toBe('ConversationGovernanceEvent');
    });
  });

  describe('legacy conversationEvents channel is frozen', () => {
    const baseline = (() => {
      try {
        return execSync('git show origin/develop:schema.graphql', {
          cwd: root,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch {
        return undefined;
      }
    })();

    const itWithBaseline = baseline ? it : it.skip;

    itWithBaseline.each([
      'ConversationEventSubscriptionResult',
      'ConversationEventType',
      'ConversationCreatedEvent',
      'ConversationMessageReceivedEvent',
      'ConversationMessageRemovedEvent',
      'ConversationReadReceiptUpdatedEvent',
      'ConversationMemberAddedEvent',
      'ConversationMemberRemovedEvent',
      'ConversationDeletedEvent',
    ])('%s is identical to the develop baseline', typeName => {
      const baselineSchema = buildSchema(baseline as string);
      const before = baselineSchema.getType(typeName);
      const after = schema.getType(typeName);
      expect(before, `${typeName} missing from baseline`).toBeDefined();
      expect(after, `${typeName} missing from schema`).toBeDefined();
      expect(printType(after!)).toBe(printType(before!));
    });

    itWithBaseline(
      'Subscription.conversationEvents keeps its signature',
      () => {
        const baselineSchema = buildSchema(baseline as string);
        const before = (
          baselineSchema.getType('Subscription') as GraphQLObjectType
        ).getFields().conversationEvents;
        const after = objectType('Subscription').getFields().conversationEvents;
        expect(after.type.toString()).toBe(before.type.toString());
        expect(after.args.map(a => a.name)).toEqual(
          before.args.map(a => a.name)
        );
      }
    );
  });
});
