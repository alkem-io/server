import { MigrationInterface, QueryRunner } from 'typeorm';

export class collaborationEntity1658236087719 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`collaboration\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`authorizationId\` varchar(36) NULL, UNIQUE INDEX \`REL_262ecf3f5d70b82a4833618425\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`callout\` (\`id\` varchar(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`displayName\` varchar(255) NOT NULL, \`nameID\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`type\` text NOT NULL, \`state\` text NOT NULL DEFAULT 'Open', \`visibility\` text NOT NULL DEFAULT 'Draft', \`authorizationId\` varchar(36) NULL, \`commentsId\` varchar(36) NULL, \`collaborationId\` varchar(36) NULL, UNIQUE INDEX \`REL_6289dee12effb51320051c6f1f\` (\`authorizationId\`), UNIQUE INDEX \`REL_62ed316cda7b75735b20307b47\` (\`commentsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_09b225228f9d675758232a43441\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`contextId\``);
    await queryRunner.query(
      `DROP INDEX \`FK_6c57bb50b3b6fb4943c807c83ce\` ON \`aspect\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`contextId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`calloutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD UNIQUE INDEX \`IDX_6325f4ef25c4e07e723a96ed37\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_d4551f18fed106ae2e20c70f7c\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`collaborationId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_fa617e79d6b2926edc7b4a3878\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`calloutId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6325f4ef25c4e07e723a96ed37\` ON \`hub\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_d4551f18fed106ae2e20c70f7c\` ON \`challenge\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\` (\`collaborationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD CONSTRAINT \`FK_262ecf3f5d70b82a48336184251\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_6289dee12effb51320051c6f1fc\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`comments\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_9b1c5ee044611ac78249194ec35\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` ADD CONSTRAINT \`FK_6325f4ef25c4e07e723a96ed37c\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_d4551f18fed106ae2e20c70f7cb\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_fa617e79d6b2926edc7b4a3878f\` FOREIGN KEY (\`collaborationId\`) REFERENCES \`collaboration\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_fa617e79d6b2926edc7b4a3878f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_d4551f18fed106ae2e20c70f7cb\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP FOREIGN KEY \`FK_6325f4ef25c4e07e723a96ed37c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_9b1c5ee044611ac78249194ec35\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_6289dee12effb51320051c6f1fc\``
    );
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP FOREIGN KEY \`FK_262ecf3f5d70b82a48336184251\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_fa617e79d6b2926edc7b4a3878\` ON \`opportunity\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d4551f18fed106ae2e20c70f7c\` ON \`challenge\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6325f4ef25c4e07e723a96ed37\` ON \`hub\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_fa617e79d6b2926edc7b4a3878\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_d4551f18fed106ae2e20c70f7c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP INDEX \`IDX_6325f4ef25c4e07e723a96ed37\``
    );
    await queryRunner.query(
      `ALTER TABLE \`hub\` DROP COLUMN \`collaborationId\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`calloutId\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`contextId\` varchar(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`contextId\` char(36) NULL DEFAULT 'NULL'`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_62ed316cda7b75735b20307b47\` ON \`callout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6289dee12effb51320051c6f1f\` ON \`callout\``
    );
    await queryRunner.query(`DROP TABLE \`callout\``);
    await queryRunner.query(
      `DROP INDEX \`REL_262ecf3f5d70b82a4833618425\` ON \`collaboration\``
    );
    await queryRunner.query(`DROP TABLE \`collaboration\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_09b225228f9d675758232a43441\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_6c57bb50b3b6fb4943c807c83ce\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }
}
