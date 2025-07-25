import { MigrationInterface, QueryRunner } from 'typeorm';

export class MemosEntity1753440983293 implements MigrationInterface {
  name = 'MemosEntity1753440983293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`memo\` (
            \`id\` char(36) NOT NULL,
            \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            \`version\` int NOT NULL,
            \`nameID\` varchar(36) NOT NULL,
            \`content\` longtext NOT NULL,
            \`createdBy\` char(36) NULL,
            \`contentUpdatePolicy\` varchar(128) NOT NULL,
            \`authorizationId\` char(36) NULL,
            \`profileId\` char(36) NULL,
            UNIQUE INDEX \`REL_c3a02e516496db62a676a0bfb7\` (\`authorizationId\`),
            UNIQUE INDEX \`REL_3eae185405c8e3a7d1828cf863\`
            (\`profileId\`), PRIMARY KEY (\`id\`))
            ENGINE=InnoDB`);
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD \`memoId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD \`memoId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` CHANGE \`type\` \`type\` enum ('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'memo', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona') NOT NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7c71c36a3eba63b8b52b30eb25\` ON \`callout_framing\` (\`memoId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d1e29afff9bc73a1e20e468e3f\` ON \`callout_contribution\` (\`memoId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`memo\` ADD CONSTRAINT \`FK_c3a02e516496db62a676a0bfb74\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`memo\` ADD CONSTRAINT \`FK_3eae185405c8e3a7d1828cf8639\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_7c71c36a3eba63b8b52b30eb25d\` FOREIGN KEY (\`memoId\`) REFERENCES \`memo\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_d1e29afff9bc73a1e20e468e3fd\` FOREIGN KEY (\`memoId\`) REFERENCES \`memo\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_d1e29afff9bc73a1e20e468e3fd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_7c71c36a3eba63b8b52b30eb25d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`memo\` DROP FOREIGN KEY \`FK_3eae185405c8e3a7d1828cf8639\``
    );
    await queryRunner.query(
      `ALTER TABLE \`memo\` DROP FOREIGN KEY \`FK_c3a02e516496db62a676a0bfb74\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d1e29afff9bc73a1e20e468e3f\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7c71c36a3eba63b8b52b30eb25\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` CHANGE \`type\` \`type\` enum ('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona') NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP COLUMN \`memoId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP COLUMN \`memoId\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_3eae185405c8e3a7d1828cf863\` ON \`memo\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c3a02e516496db62a676a0bfb7\` ON \`memo\``
    );
    await queryRunner.query(`DROP TABLE \`memo\``);
  }
}
