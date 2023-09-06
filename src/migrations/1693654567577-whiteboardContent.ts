import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardContent1693654567577 implements MigrationInterface {
  name = 'whiteboardContent1693654567577';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` RENAME COLUMN \`value\` TO \`content\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` RENAME COLUMN \`value\` TO \`content\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` RENAME COLUMN \`content\` TO \`value\``
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard_template\` RENAME COLUMN \`content\` TO \`value\``
    );
  }
}
