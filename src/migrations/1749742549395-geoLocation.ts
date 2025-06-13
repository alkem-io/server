import { MigrationInterface, QueryRunner } from 'typeorm';

export class GeoLocation1749742549395 implements MigrationInterface {
  name = 'GeoLocation1749742549395';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`location\` ADD \`geoLocation\` json NOT NULL`
    );
    await queryRunner.query(
      `UPDATE \`location\` SET geoLocation = '{"latitude": null, "longitude": null, "isValid": false}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`location\` DROP COLUMN \`geoLocation\``
    );
  }
}
