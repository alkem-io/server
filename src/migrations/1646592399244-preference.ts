import { MigrationInterface, QueryRunner } from 'typeorm';

export class preference1646592399244 implements MigrationInterface {
  name = 'preference1646592399244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE user_preference RENAME TO preference');
    await queryRunner.query(
      'ALTER TABLE user_preference_definition RENAME TO preference_definition'
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` RENAME COLUMN \`userPreferenceDefinitionId\` TO \`preferenceDefinitionId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE preference RENAME TO user_preference');
    await queryRunner.query(
      'ALTER TABLE preference_definition RENAME TO user_preference_definition'
    );
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` RENAME COLUMN \`preferenceDefinitionId\` TO \`userPreferenceDefinitionId\``
    );
  }
}
