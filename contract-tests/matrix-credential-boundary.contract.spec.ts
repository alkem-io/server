import { readdirSync, readFileSync, statSync } from 'fs';
import {
  buildSchema,
  GraphQLInputObjectType,
  GraphQLObjectType,
  isInputObjectType,
  isObjectType,
} from 'graphql';
import path from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * The platform never issues, proxies or stores a messaging-backend credential,
 * never exposes a backend room identifier outside operator tooling, and its
 * messaging configuration names no backend address or secret. These golden
 * lists turn that fact into a regression-proof invariant.
 */
describe('Contract: messaging backend credential boundary', () => {
  const root = path.resolve(__dirname, '..');
  const schema = buildSchema(
    readFileSync(path.join(root, 'schema.graphql'), 'utf-8')
  );

  describe('(a) the API schema', () => {
    const CREDENTIAL_NAME =
      /access[_]?token|as_token|hs_token|bearer|device_?id|homeserver|matrix.*token|synapse/i;
    const CREDENTIAL_ALLOW_LIST = ['CollaboraEditorUrlResult.accessTokenTTL'];
    const MATRIX_ROOM_ID_ELEMENTS = [
      'CommunicationAdminRoomMembershipResult.roomID',
      'CommunicationAdminRemoveOrphanedRoomInput.roomID',
      'CommunicationAdminUpdateRoomStateInput.roomID',
    ].sort();

    const composites = () =>
      Object.values(schema.getTypeMap()).filter(
        (type): type is GraphQLObjectType | GraphQLInputObjectType =>
          (isObjectType(type) || isInputObjectType(type)) &&
          !type.name.startsWith('__')
      );

    it('has no credential-shaped field or argument name outside the allow-list', () => {
      const offenders: string[] = [];
      for (const type of composites()) {
        for (const [fieldName, field] of Object.entries(type.getFields())) {
          const id = `${type.name}.${fieldName}`;
          if (
            CREDENTIAL_NAME.test(fieldName) &&
            !CREDENTIAL_ALLOW_LIST.includes(id)
          ) {
            offenders.push(id);
          }
          const args = 'args' in field ? field.args : [];
          for (const arg of args) {
            if (CREDENTIAL_NAME.test(arg.name)) {
              offenders.push(`${id}(${arg.name})`);
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    it('keeps every allow-listed element real, so the list cannot rot', () => {
      for (const id of CREDENTIAL_ALLOW_LIST) {
        const [typeName, fieldName] = id.split('.');
        const type = schema.getType(typeName);
        expect(isObjectType(type) || isInputObjectType(type), id).toBe(true);
        expect(
          (type as GraphQLObjectType).getFields()[fieldName],
          id
        ).toBeDefined();
      }
    });

    it('exposes a backend room identifier on exactly the three operator-only elements', () => {
      const MATRIX_ROOM_ID =
        /matrix\s*room\s*id|room\s*id\s*(in|on|of)\s*(the\s*)?matrix/i;
      const found: string[] = [];
      for (const type of composites()) {
        for (const [fieldName, field] of Object.entries(type.getFields())) {
          const describesMatrixRoomId = MATRIX_ROOM_ID.test(
            field.description ?? ''
          );
          const operatorRoomId =
            fieldName === 'roomID' &&
            type.name.startsWith('CommunicationAdmin');
          if (describesMatrixRoomId || operatorRoomId) {
            found.push(`${type.name}.${fieldName}`);
          }
        }
      }
      expect(found.sort()).toEqual(MATRIX_ROOM_ID_ELEMENTS);
    });
  });

  describe('(b) the messaging configuration subtree', () => {
    const GOLDEN_KEYS = [
      'enabled',
      'matrix.connection_retries',
      'matrix.connection_timeout',
      'discussions.enabled',
      'proxy_usage.enabled',
      'proxy_usage.flush_interval_ms',
    ].sort();

    const flattenKeys = (value: unknown, prefix = ''): string[] => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return [prefix];
      }
      return Object.entries(value as Record<string, unknown>).flatMap(
        ([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k)
      );
    };

    it('alkemio.yml `communications` has exactly the golden keys (no address, no secret)', () => {
      const config = parseYaml(
        readFileSync(path.join(root, 'alkemio.yml'), 'utf-8')
      );
      expect(flattenKeys(config.communications).sort()).toEqual(GOLDEN_KEYS);
    });

    it('the `communications` type in alkemio.config.ts has exactly the golden keys', () => {
      const source = readFileSync(
        path.join(root, 'src/types/alkemio.config.ts'),
        'utf-8'
      );
      const start = source.indexOf('  communications: {');
      expect(start, 'communications block not found').toBeGreaterThan(-1);
      // Walk braces to the end of the block.
      let depth = 0;
      let end = start;
      for (let i = source.indexOf('{', start); i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}') depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
      const block = source.slice(source.indexOf('{', start), end + 1);

      const keys: string[] = [];
      const stack: string[] = [];
      for (const rawLine of block.split('\n').slice(1)) {
        const line = rawLine.trim();
        if (line === '}' || line === '};') {
          stack.pop();
          continue;
        }
        const nested = line.match(/^([a-z_]+): \{$/);
        if (nested) {
          stack.push(nested[1]);
          continue;
        }
        const leaf = line.match(/^([a-z_]+): [a-z]+;$/);
        if (leaf) {
          keys.push([...stack, leaf[1]].join('.'));
        }
      }
      expect(keys.sort()).toEqual(GOLDEN_KEYS);
    });
  });

  describe('(c) the pinned adapter contract library', () => {
    const TOKEN_PROPERTY =
      /^\s*(readonly\s+)?['"]?[A-Za-z_]*(access_?token|as_?token|hs_?token)[A-Za-z_]*['"]?\??\s*:/i;

    const declarationFiles = (dir: string): string[] =>
      readdirSync(dir).flatMap(entry => {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) return declarationFiles(full);
        return full.endsWith('.d.ts') ? [full] : [];
      });

    it('declares no token-shaped property in any response or request type', () => {
      const dist = path.join(
        root,
        'node_modules/@alkemio/matrix-adapter-lib/dist'
      );
      const files = declarationFiles(dist);
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const file of files) {
        readFileSync(file, 'utf-8')
          .split('\n')
          .forEach((line, index) => {
            if (TOKEN_PROPERTY.test(line)) {
              offenders.push(
                `${path.relative(root, file)}:${index + 1}: ${line.trim()}`
              );
            }
          });
      }
      expect(offenders).toEqual([]);
    });
  });
});
