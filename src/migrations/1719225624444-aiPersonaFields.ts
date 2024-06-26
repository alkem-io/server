import { MigrationInterface, QueryRunner } from 'typeorm';

export class aiPersonaFields1719225624444 implements MigrationInterface {
  name = 'aiPersonaFields1719225624444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD \`bodyOfKnowledge\` text DEFAULT  NULL`
    );

    throw new Error(`migration completed successfully `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
