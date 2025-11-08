import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  createKratosIdentityFetcher,
  MigrationKratosIdentityFetcher,
} from './utils/kratos.identity.fetcher';
import {
  createMigrationAssignAuthIdHelper,
  MigrationAssignAuthIdResult,
} from '@domain/community/user/user.service';

interface AuditEntry {
  userId: string;
  email: string;
  status: 'missing' | 'duplicate' | 'error';
  identityId?: string;
  detail?: string;
}

const AUDIT_TABLE_NAME = 'user_authid_backfill_audit';
const USER_TABLE_NAME = 'user';

const MIGRATION_LOG_PREFIX = '[migration:user-authid]';

class MigrationConsoleLogger {
  log(message: string) {
    console.log(`${MIGRATION_LOG_PREFIX} ${message}`);
  }

  warn(message: string) {
    console.warn(`${MIGRATION_LOG_PREFIX} ${message}`);
  }

  debug(message: string) {
    if (process.env.DEBUG?.includes('user-authid-migration')) {
      console.debug(`${MIGRATION_LOG_PREFIX} ${message}`);
    }
  }
}

export class UserAuthIdBackfill1762700000000
  implements MigrationInterface
{
  name = 'UserAuthIdBackfill1762700000000';

  constructor(
    private readonly fetcher: MigrationKratosIdentityFetcher =
      createKratosIdentityFetcher()
  ) {}

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureSchema(queryRunner);

    const logger = new MigrationConsoleLogger();
    const helper = createMigrationAssignAuthIdHelper(queryRunner, logger);

    const users = (await queryRunner.query(
      `SELECT id, email FROM \`${USER_TABLE_NAME}\` WHERE authId IS NULL`
    )) as Array<{ id: string; email: string }>;

    for (const user of users) {
      try {
        const identities = await this.fetcher.findByEmail(user.email);

        if (!identities.length) {
          await this.insertAuditEntry(queryRunner, {
            userId: user.id,
            email: user.email,
            status: 'missing',
            detail: 'Kratos identity not found for email',
          });
          continue;
        }

        if (identities.length > 1) {
          await this.insertAuditEntry(queryRunner, {
            userId: user.id,
            email: user.email,
            status: 'duplicate',
            detail: `Multiple Kratos identities resolved: ${identities
              .map(identity => identity.id)
              .join(', ')}`,
          });
          continue;
        }

        const identity = identities[0];
        const result = await helper.assign(user.id, identity.id);
        await this.handleAssignmentResult(queryRunner, user, identity.id, result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);
        await this.insertAuditEntry(queryRunner, {
          userId: user.id,
          email: user.email,
          status: 'error',
          detail: message,
        });
        throw error;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const auditTableExists = await queryRunner.hasTable(AUDIT_TABLE_NAME);
    if (auditTableExists) {
      await queryRunner.query(`DROP TABLE \`${AUDIT_TABLE_NAME}\``);
    }

    const userTable = await queryRunner.getTable(USER_TABLE_NAME);
    const authIdIndexExists = userTable?.indices.some(
      index => index.name === 'IDX_user_authId'
    );
    if (authIdIndexExists) {
      await queryRunner.query(
        `DROP INDEX \`IDX_user_authId\` ON \`${USER_TABLE_NAME}\``
      );
    }

    const authIdColumnExists = userTable?.findColumnByName('authId');
    if (authIdColumnExists) {
      await queryRunner.query(
        `ALTER TABLE \`${USER_TABLE_NAME}\` DROP COLUMN \`authId\``
      );
    }
  }

  private async ensureSchema(queryRunner: QueryRunner): Promise<void> {
    const userTable = await queryRunner.getTable(USER_TABLE_NAME);
    const authIdColumnExists = userTable?.findColumnByName('authId');
    if (!authIdColumnExists) {
      await queryRunner.query(
        `ALTER TABLE \`${USER_TABLE_NAME}\` ADD COLUMN \`authId\` char(36) NULL`
      );
    }

    const authIdIndexExists = userTable?.indices.some(
      index => index.name === 'IDX_user_authId'
    );
    if (!authIdIndexExists) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX \`IDX_user_authId\` ON \`${USER_TABLE_NAME}\` (\`authId\`)`
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`${AUDIT_TABLE_NAME}\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`userId\` char(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`status\` enum('missing','duplicate','error') NOT NULL,
        \`identityId\` char(36) NULL,
        \`detail\` text NULL,
        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_user_authid_audit_user\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  private async insertAuditEntry(
    queryRunner: QueryRunner,
    entry: AuditEntry
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`${AUDIT_TABLE_NAME}\` (\`userId\`, \`email\`, \`status\`, \`identityId\`, \`detail\`) VALUES (?, ?, ?, ?, ?)`,
      [
        entry.userId,
        entry.email,
        entry.status,
        entry.identityId ?? null,
        entry.detail ?? null,
      ]
    );
  }

  private async handleAssignmentResult(
    queryRunner: QueryRunner,
    user: { id: string; email: string },
    identityId: string,
    result: MigrationAssignAuthIdResult
  ) {
    if (result.status === 'assigned' || result.status === 'already-linked') {
      return;
    }

    if (result.status === 'duplicate') {
      await this.insertAuditEntry(queryRunner, {
        userId: user.id,
        email: user.email,
        status: 'duplicate',
        identityId,
        detail: `authId already linked to ${result.conflictUserId}`,
      });
      return;
    }

    if (result.status === 'missing-user') {
      await this.insertAuditEntry(queryRunner, {
        userId: user.id,
        email: user.email,
        status: 'error',
        identityId,
        detail: 'User not found during migration assignment',
      });
    }
  }
}
