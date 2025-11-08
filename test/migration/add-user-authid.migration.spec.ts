import { Identity } from '@ory/kratos-client';
import { QueryRunner } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import {
  MigrationKratosIdentityFetcher,
} from '../../src/migrations/utils/kratos.identity.fetcher';
import { UserAuthIdBackfill1762700000000 } from '../../src/migrations/1762700000000-userAuthIdBackfill';

interface MockUserRecord {
  id: string;
  email: string;
  authId: string | null;
}

interface AuditRecord {
  userId: string;
  email: string;
  status: 'missing' | 'duplicate' | 'error';
  identityId: string | null;
  detail: string | null;
}

class StubRepository {
  constructor(private readonly users: Map<string, MockUserRecord>) {}

  async findOne(options: { where: { id?: string; authId?: string } }) {
    const { id, authId } = options.where ?? {};
    if (id) {
      return this.users.get(id) ?? null;
    }

    if (authId) {
      for (const user of this.users.values()) {
        if (user.authId === authId) {
          return user;
        }
      }
    }

    return null;
  }

  async save(entity: MockUserRecord) {
    this.users.set(entity.id, entity);
    return entity;
  }
}

class StubMigrationQueryRunner {
  public readonly manager: { getRepository: (entity: unknown) => StubRepository };
  public readonly executedQueries: string[] = [];
  private schemaState = {
    authIdColumnExists: false,
    authIdIndexExists: false,
    auditTableExists: false,
  };

  constructor(
    private readonly users: Map<string, MockUserRecord>,
    private readonly auditEntries: AuditRecord[]
  ) {
    const repository = new StubRepository(this.users);
    this.manager = {
      getRepository: (entity: unknown) => {
        if (entity !== User) {
          throw new Error(
            `Unexpected repository request for entity ${(entity as any)?.name}`
          );
        }

        return repository;
      },
    };
  }

  async query(query: string, parameters?: any[]): Promise<any> {
    this.executedQueries.push(query);

    if (query.startsWith('SELECT id, email FROM `user` WHERE authId IS NULL')) {
      return Array.from(this.users.values())
        .filter(user => !user.authId)
        .map(user => ({ id: user.id, email: user.email }));
    }

    if (query.startsWith('SELECT id, email FROM `user` WHERE id = ?')) {
      const [userId] = parameters ?? [];
      const user = this.users.get(userId);
      return user ? [{ id: user.id, email: user.email, authId: user.authId }] : [];
    }

    if (query.startsWith('SELECT id, authId FROM `user` WHERE id = ?')) {
      const [userId] = parameters ?? [];
      const user = this.users.get(userId);
      return user ? [{ id: user.id, authId: user.authId }] : [];
    }

    if (query.startsWith('SELECT id FROM `user` WHERE authId = ? AND id <> ? LIMIT 1') ||
        query.startsWith('SELECT id FROM `user` WHERE authId = ? AND id <> ?')) {
      const [authId, excludeUserId] = parameters ?? [];
      for (const user of this.users.values()) {
        if (user.authId === authId && user.id !== excludeUserId) {
          return [{ id: user.id }];
        }
      }
      return [];
    }

    if (query.match(/^UPDATE\s+`?user`?\s+SET\s+`?authId`?\s*=\s*\?\s+WHERE\s+`?id`?\s*=\s*\?/i)) {
      const [authId, userId] = parameters ?? [];
      const user = this.users.get(userId);
      if (user) {
        user.authId = authId;
        return { affectedRows: 1 };
      }
      return { affectedRows: 0 };
    }

    if (query.startsWith('INSERT INTO `user_authid_backfill_audit`')) {
      const [userId, email, status, identityId, detail] = parameters ?? [];
      this.auditEntries.push({
        userId,
        email,
        status,
        identityId: identityId ?? null,
        detail: detail ?? null,
      });
      return [];
    }

    if (query.includes('ADD COLUMN `authId`')) {
      this.schemaState.authIdColumnExists = true;
    }

    if (query.includes('CREATE UNIQUE INDEX `IDX_user_authId`')) {
      this.schemaState.authIdIndexExists = true;
    }

    if (query.includes('CREATE TABLE IF NOT EXISTS `user_authid_backfill_audit`')) {
      this.schemaState.auditTableExists = true;
    }

    if (query.includes('DROP TABLE') && query.includes('user_authid_backfill_audit')) {
      this.schemaState.auditTableExists = false;
    }

    if (query.includes('DROP INDEX `IDX_user_authId`') || query.includes('DROP INDEX IF EXISTS `IDX_user_authId`')) {
      this.schemaState.authIdIndexExists = false;
    }

    if (query.includes('DROP COLUMN `authId`') || query.includes('DROP COLUMN IF EXISTS `authId`')) {
      this.schemaState.authIdColumnExists = false;
    }

    return [];
  }

  async hasTable(tableName: string): Promise<boolean> {
    if (tableName === 'user_authid_backfill_audit') {
      return this.schemaState.auditTableExists;
    }
    if (tableName === 'user') {
      return true;
    }
    return false;
  }

  async getTable(tableName: string): Promise<any> {
    if (tableName === 'user') {
      return {
        name: 'user',
        findColumnByName: (columnName: string) => {
          if (columnName === 'authId') {
            return this.schemaState.authIdColumnExists ? { name: 'authId' } : undefined;
          }
          return undefined;
        },
        indices: this.schemaState.authIdIndexExists
          ? [{ name: 'IDX_user_authId' }]
          : [],
      };
    }
    return undefined;
  }

  getAuditEntries(): AuditRecord[] {
    return this.auditEntries;
  }
}

const identity = (id: string, email: string): Identity =>
  ({
    id,
    traits: { email },
  } as Identity);

describe('UserAuthIdBackfill1762700000000', () => {
  it('backfills authIds and records audit entries for unresolved users', async () => {
    const users = new Map<string, MockUserRecord>([
      [
        'user-assigned',
        { id: 'user-assigned', email: 'assigned@example.com', authId: null },
      ],
      [
        'user-missing',
        { id: 'user-missing', email: 'missing@example.com', authId: null },
      ],
      [
        'user-duplicate',
        { id: 'user-duplicate', email: 'duplicate@example.com', authId: null },
      ],
      [
        'user-conflict-existing',
        {
          id: 'user-conflict-existing',
          email: 'existing@example.com',
          authId: 'kratos-conflict',
        },
      ],
      [
        'user-conflict-target',
        {
          id: 'user-conflict-target',
          email: 'conflict@example.com',
          authId: null,
        },
      ],
    ]);

    const auditEntries: AuditRecord[] = [];
    const queryRunner = new StubMigrationQueryRunner(users, auditEntries);

    const fetcher: MigrationKratosIdentityFetcher = {
      findByEmail: jest.fn(async email => {
        switch (email) {
          case 'assigned@example.com':
            return [identity('kratos-assigned', email)];
          case 'duplicate@example.com':
            return [
              identity('kratos-duplicate-1', email),
              identity('kratos-duplicate-2', email),
            ];
          case 'conflict@example.com':
            return [identity('kratos-conflict', email)];
          default:
            return [];
        }
      }),
    };

    const migration = new UserAuthIdBackfill1762700000000(fetcher);

    await migration.up(queryRunner as unknown as QueryRunner);

    expect(fetcher.findByEmail).toHaveBeenCalledTimes(4);

    expect(users.get('user-assigned')?.authId).toBe('kratos-assigned');
    expect(users.get('user-missing')?.authId).toBeNull();
    expect(users.get('user-duplicate')?.authId).toBeNull();
    expect(users.get('user-conflict-target')?.authId).toBeNull();

    const entries = queryRunner.getAuditEntries();
    expect(entries).toHaveLength(3);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'user-missing',
          status: 'missing',
          detail: 'Kratos identity not found for email',
        }),
        expect.objectContaining({
          userId: 'user-duplicate',
          status: 'duplicate',
          detail:
            'Multiple Kratos identities resolved: kratos-duplicate-1, kratos-duplicate-2',
        }),
        expect.objectContaining({
          userId: 'user-conflict-target',
          status: 'duplicate',
          identityId: 'kratos-conflict',
          detail: 'authId already linked to user-conflict-existing',
        }),
      ])
    );
  });

  it('down removes authId schema artifacts', async () => {
    const migration = new UserAuthIdBackfill1762700000000();
    const queries: string[] = [];

    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      getTable: jest.fn().mockResolvedValue({
        name: 'user',
        findColumnByName: jest.fn().mockReturnValue({ name: 'authId' }),
        indices: [{ name: 'IDX_user_authId' }],
      }),
      query: jest.fn().mockImplementation(async (query: string) => {
        queries.push(query);
        return undefined;
      }),
    } as unknown as QueryRunner;

    await migration.down(runner);

    expect(runner.hasTable).toHaveBeenCalledWith('user_authid_backfill_audit');
    expect(runner.getTable).toHaveBeenCalledWith('user');
    expect(queries).toEqual([
      'DROP TABLE `user_authid_backfill_audit`',
      'DROP INDEX `IDX_user_authId` ON `user`',
      'ALTER TABLE `user` DROP COLUMN `authId`',
    ]);
  });
});
