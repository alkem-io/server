import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Conversations1761408055225 implements MigrationInterface {
  name = 'Conversations1761408055225';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`conversation\` (\`id\` char(36) NOT NULL,
                                                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                \`version\` int NOT NULL,
                                                                \`type\` varchar(128) NOT NULL,
                                                                \`userIDs\` json NOT NULL,
                                                                \`virtualContributorID\` char(36) NULL,
                                                                \`authorizationId\` char(36) NULL,
                                                                \`conversationsSetId\` char(36) NULL,
                                                                \`roomId\` char(36) NULL,
                                                                UNIQUE INDEX \`REL_a6cdd15ca94945e57a3abbf64d\` (\`authorizationId\`),
                                                                UNIQUE INDEX \`REL_c3eb45de493217a6d0e225028f\` (\`roomId\`),
                                                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`conversations_set\` (\`id\` char(36) NOT NULL,
                                                                     \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                     \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                     \`version\` int NOT NULL,
                                                                     \`authorizationId\` char(36) NULL,
                                                                     UNIQUE INDEX \`REL_57e3ee47af26b479a67e7f94da\` (\`authorizationId\`),
                                                                     PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD \`conversationsSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD UNIQUE INDEX \`IDX_dc8bdff7728d61097c8560ae7a\` (\`conversationsSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_dc8bdff7728d61097c8560ae7a\` ON \`platform\` (\`conversationsSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_a6cdd15ca94945e57a3abbf64d1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_9604668892b53a75690fb92ec25\` FOREIGN KEY (\`conversationsSetId\`) REFERENCES \`conversations_set\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation\` ADD CONSTRAINT \`FK_c3eb45de493217a6d0e225028fa\` FOREIGN KEY (\`roomId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`conversations_set\` ADD CONSTRAINT \`FK_57e3ee47af26b479a67e7f94da0\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` ADD CONSTRAINT \`FK_dc8bdff7728d61097c8560ae7a9\` FOREIGN KEY (\`conversationsSetId\`) REFERENCES \`conversations_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Create conversations set for platform
    const [platform]: { id: string }[] = await queryRunner.query(
      `SELECT id FROM \`platform\` LIMIT 1`
    );
    if (platform) {
      const conversationsSetID = await this.createConversationsSet(queryRunner);
      await queryRunner.query(
        `UPDATE \`platform\` SET conversationsSetId = '${conversationsSetID}' WHERE id = '${platform.id}'`
      );
    }
  }

  private async createConversationsSet(
    queryRunner: QueryRunner
  ): Promise<string> {
    const conversationsSetID = randomUUID();
    const conversationsSetAuthID = await this.createAuthorizationPolicy(
      queryRunner,
      'communication-conversations-set'
    );
    await queryRunner.query(
      `INSERT INTO conversations_set (id, version, authorizationId) VALUES
        ('${conversationsSetID}', 1, '${conversationsSetAuthID}')`
    );
    return conversationsSetID;
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    policyType: string
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type) VALUES
        ('${authID}', 1, '[]', '[]', '[]', '${policyType}')`
    );
    return authID;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP FOREIGN KEY \`FK_dc8bdff7728d61097c8560ae7a9\``
    );
    await queryRunner.query(
      `ALTER TABLE \`conversations_set\` DROP FOREIGN KEY \`FK_57e3ee47af26b479a67e7f94da0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_c3eb45de493217a6d0e225028fa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_9604668892b53a75690fb92ec25\``
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation\` DROP FOREIGN KEY \`FK_a6cdd15ca94945e57a3abbf64d1\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dc8bdff7728d61097c8560ae7a\` ON \`platform\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP INDEX \`IDX_dc8bdff7728d61097c8560ae7a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`platform\` DROP COLUMN \`conversationsSetId\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_57e3ee47af26b479a67e7f94da\` ON \`conversations_set\``
    );
    await queryRunner.query(`DROP TABLE \`conversations_set\``);
    await queryRunner.query(
      `DROP INDEX \`REL_c3eb45de493217a6d0e225028f\` ON \`conversation\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a6cdd15ca94945e57a3abbf64d\` ON \`conversation\``
    );
    await queryRunner.query(`DROP TABLE \`conversation\``);
  }
}
