import { MigrationInterface, QueryRunner } from 'typeorm';

export class visual1642233654294 implements MigrationInterface {
  name = 'visual1642233654294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`visual2\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`uri\` text NOT NULL, \`minWidth\` int NOT NULL, \`maxWidth\` int NOT NULL, \`minHeigt\` int NOT NULL, \`maxHeight\` int NOT NULL, \`aspectRatio\` int NOT NULL, \`allowedTypes\` text NOT NULL, \`authorizationId\` char(36) NULL, \`contextId\` char(36) NULL, UNIQUE INDEX \`REL_439d0b187986492b58178a82c3\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(`ALTER TABLE \`context\` DROP COLUMN \`visualId\``);
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`avatar\``);
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`avatarId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_65588ca8ac212b8357637794d6\` (\`avatarId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual2\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual2\` ADD CONSTRAINT \`FK_63de1450cf75dc486700ca034c6\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_65588ca8ac212b8357637794d6f\` FOREIGN KEY (\`avatarId\`) REFERENCES \`visual2\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`visual2\` DROP FOREIGN KEY \`FK_63de1450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual2\` DROP FOREIGN KEY \`FK_439d0b187986492b58178a82c3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`visualId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_439d0b187986492b58178a82c3\` ON \`visual2\``
    );
    await queryRunner.query(`DROP TABLE \`visual2\``);
    await queryRunner.query(`ALTER TABLE \`profile\` ADD \`avatar\` text NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9dd986ff532f7e2447ffe4934d\` ON \`context\` (\`visualId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_9dd986ff532f7e2447ffe4934d2\` FOREIGN KEY (\`visualId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
