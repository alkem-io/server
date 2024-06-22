import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixPersonaEngines1715780931509 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // All credentials need to be updated to reflect the new type
    await queryRunner.query(`
      UPDATE virtual_persona
      SET engine = 'expert'
      WHERE engine = 'alkemio-digileefomgeving';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
