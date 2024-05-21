import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateVirtualContributor1716202782049
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_5c6f158a128406aafb9808b3a82\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5c6f158a128406aafb9808b3a8\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7b8b29a41564c268b864bc85ff\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a1a11662383fefcb81416116a6\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c947646f184a6f7aeee68be999\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`bodyOfKnowledgeType\` varchar(64) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`bodyOfKnowledgeID\` varchar(256) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`accountId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_e2eaa2213ac4454039cd8abc07\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_4504c37764f6962ccbd165a21d\` (\`profileId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_a8890dcd65b8c3ee6e160d33f3\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_ce68cea88d194e0240b737c3f0\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_e2eaa2213ac4454039cd8abc07\` ON \`virtual_contributor\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_4504c37764f6962ccbd165a21d\` ON \`virtual_contributor\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a8890dcd65b8c3ee6e160d33f3\` ON \`virtual_contributor\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_ce68cea88d194e0240b737c3f0\` ON \`virtual_contributor\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_e2eaa2213ac4454039cd8abc07d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_4504c37764f6962ccbd165a21de\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_a8890dcd65b8c3ee6e160d33f3a\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_ce68cea88d194e0240b737c3f0c\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_5c6f158a128406aafb9808b3a82\` FOREIGN KEY (\`virtualPersonaId\`) REFERENCES \`virtual_persona\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_7a962c9b04b0d197bc3c93262a7\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_7a962c9b04b0d197bc3c93262a7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_5c6f158a128406aafb9808b3a82\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_ce68cea88d194e0240b737c3f0c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_a8890dcd65b8c3ee6e160d33f3a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_4504c37764f6962ccbd165a21de\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_e2eaa2213ac4454039cd8abc07d\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_ce68cea88d194e0240b737c3f0\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a8890dcd65b8c3ee6e160d33f3\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_4504c37764f6962ccbd165a21d\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_e2eaa2213ac4454039cd8abc07\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_ce68cea88d194e0240b737c3f0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_a8890dcd65b8c3ee6e160d33f3\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_4504c37764f6962ccbd165a21d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP INDEX \`IDX_e2eaa2213ac4454039cd8abc07\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`accountId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`bodyOfKnowledgeID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`bodyOfKnowledgeType\``
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c947646f184a6f7aeee68be999\` ON \`virtual_contributor\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a1a11662383fefcb81416116a6\` ON \`virtual_contributor\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7b8b29a41564c268b864bc85ff\` ON \`virtual_contributor\` (\`profileId\`)`
    );
    await queryRunner.query(
      `CREATE INDEX \`REL_5c6f158a128406aafb9808b3a8\` ON \`virtual_contributor\` (\`virtualPersonaId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_5c6f158a128406aafb9808b3a82\` FOREIGN KEY (\`virtualPersonaId\`) REFERENCES \`virtual_persona\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
