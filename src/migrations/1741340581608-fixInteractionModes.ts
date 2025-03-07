import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInteractionModes1741340581608 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE ai_persona
        SET interactionModes = 'discussion-tagging'
        WHERE interactionModes = '[discussion-tagging]';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('This migration is irreversible');
  }
}
