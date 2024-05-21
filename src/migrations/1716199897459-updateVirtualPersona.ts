import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateVirtualPersona11716199897459 implements MigrationInterface {
  name = 'updateVirtualPersona11716199897459';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP FOREIGN KEY \`FK_a6a9c0a62d17b6737eeb90b7903\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a6a9c0a62d17b6737eeb90b790\` ON \`virtual_persona\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP COLUMN \`prompt\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP COLUMN \`storageAggregatorId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD \`dataAccessMode\` varchar(64) NOT NULL DEFAULT 'space_profile'`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD \`platformId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP COLUMN \`engine\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD \`engine\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD CONSTRAINT \`FK_0e5ff0df260179127b43731bb68\` FOREIGN KEY (\`platformId\`) REFERENCES \`platform\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP FOREIGN KEY \`FK_0e5ff0df260179127b43731bb68\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP COLUMN \`engine\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD \`engine\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP COLUMN \`platformId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP COLUMN \`dataAccessMode\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD \`storageAggregatorId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD \`prompt\` text NOT NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_a6a9c0a62d17b6737eeb90b790\` ON \`virtual_persona\` (\`storageAggregatorId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` ADD CONSTRAINT \`FK_a6a9c0a62d17b6737eeb90b7903\` FOREIGN KEY (\`storageAggregatorId\`) REFERENCES \`storage_aggregator\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
