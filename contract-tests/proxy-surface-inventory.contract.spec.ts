import { readFileSync } from 'fs';
import {
  buildSchema,
  GraphQLObjectType,
  getNamedType,
  isObjectType,
} from 'graphql';
import path from 'path';
import { PROXY_SURFACE_INVENTORY } from '../src/domain/communication/proxy-surface/proxy.surface.inventory';

/**
 * Every message-related GraphQL surface must be classified in the proxy
 * surface inventory, and every classified schema surface must exist — so a
 * messaging field cannot be added (or removed) without the classification
 * following it.
 */
describe('Contract: proxy surface inventory covers the schema', () => {
  const sdl = readFileSync(
    path.resolve(__dirname, '../schema.graphql'),
    'utf-8'
  );
  const schema = buildSchema(sdl);

  /** Types whose every field is a message-related surface. */
  const MESSAGE_TYPES = [
    'Room',
    'Message',
    'Reaction',
    'Conversation',
    'RoomUnreadCounts',
    'VcInteraction',
    'MeConversationsResult',
    'ConversationEventSubscriptionResult',
    'ConversationGovernanceEvent',
  ];

  /** Container types whose fields become surfaces when they look messaging-related, with the id prefix they get. */
  const CONTAINERS: Record<string, string> = {
    Query: 'Query',
    Mutation: 'Mutation',
    Subscription: 'Subscription',
    LookupQueryResults: 'Query.lookup',
    MeQueryResults: 'Query.me',
    MeConversationsResult: 'Query.me.conversations',
    Platform: 'Query.platform',
    PlatformAdminCommunicationQueryResults: 'Query.platformAdmin.communication',
  };

  /** Message-looking names that belong to other domains. */
  const NON_MESSAGING_ALLOW_LIST = new Set([
    'Mutation.addReactionToCallout',
    'Mutation.removeReactionFromCallout',
  ]);

  const NAME_PATTERN = /message|room|conversation|reaction/i;

  const derivedSurfaceIds = (): string[] => {
    const ids = new Set<string>();

    for (const typeName of MESSAGE_TYPES) {
      if (typeName === 'MeConversationsResult') continue; // handled as a container
      const type = schema.getType(typeName);
      if (!isObjectType(type)) continue;
      for (const field of Object.keys(type.getFields())) {
        ids.add(`${typeName}.${field}`);
      }
    }

    for (const [typeName, prefix] of Object.entries(CONTAINERS)) {
      const type = schema.getType(typeName);
      if (!isObjectType(type)) continue;
      const allFields = typeName === 'MeConversationsResult';
      for (const [name, field] of Object.entries(type.getFields())) {
        const returnType = getNamedType(field.type).name;
        const looksMessaging =
          allFields ||
          NAME_PATTERN.test(name) ||
          MESSAGE_TYPES.includes(returnType);
        if (!looksMessaging) continue;
        const id = `${prefix}.${name}`;
        if (NON_MESSAGING_ALLOW_LIST.has(id)) continue;
        ids.add(id);
      }
    }

    return [...ids].sort();
  };

  const schemaHasSurface = (id: string): boolean => {
    const containerByPrefix = Object.entries(CONTAINERS)
      .sort((a, b) => b[1].length - a[1].length)
      .find(([, prefix]) => id.startsWith(`${prefix}.`));
    let typeName: string;
    let fieldName: string;
    if (containerByPrefix) {
      typeName = containerByPrefix[0];
      fieldName = id.slice(containerByPrefix[1].length + 1);
    } else {
      const dot = id.indexOf('.');
      typeName = id.slice(0, dot);
      fieldName = id.slice(dot + 1);
    }
    if (fieldName.includes('.')) return false;
    const type = schema.getType(typeName) as GraphQLObjectType | undefined;
    return !!type && isObjectType(type) && fieldName in type.getFields();
  };

  it('classifies every message-related schema surface', () => {
    const classified = new Set(PROXY_SURFACE_INVENTORY.map(e => e.id));
    const unclassified = derivedSurfaceIds().filter(id => !classified.has(id));
    expect(
      unclassified,
      `Message-related schema surfaces without a proxy surface classification: ${unclassified.join(', ')}`
    ).toEqual([]);
  });

  it('lists no schema surface that the schema does not have (unless pending on a branch)', () => {
    const schemaKinds = new Set([
      'QUERY_FIELD',
      'MUTATION',
      'SUBSCRIPTION',
      'OBJECT_FIELD',
    ]);
    const stale = PROXY_SURFACE_INVENTORY.filter(
      entry =>
        schemaKinds.has(entry.kind) &&
        !entry.pendingBranch &&
        !schemaHasSurface(entry.id)
    ).map(entry => entry.id);
    expect(
      stale,
      `Classified surfaces missing from schema.graphql: ${stale.join(', ')}`
    ).toEqual([]);
  });

  it('keeps the non-messaging allow-list honest (each entry exists and is not room-based)', () => {
    for (const id of NON_MESSAGING_ALLOW_LIST) {
      expect(schemaHasSurface(id), id).toBe(true);
      expect(
        PROXY_SURFACE_INVENTORY.some(e => e.id === id),
        id
      ).toBe(false);
    }
  });
});
