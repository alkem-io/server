import { MigrationInterface, QueryRunner } from 'typeorm';

export class canvasCheckoutStatus1655880457723 implements MigrationInterface {
  name = 'canvasCheckoutStatus1655880457723';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP COLUMN \`status\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD \`status\` varchar(255) NOT NULL DEFAULT 'available'`
    );
  }
}
