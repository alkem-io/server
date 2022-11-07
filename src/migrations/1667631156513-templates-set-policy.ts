import { MigrationInterface, QueryRunner } from 'typeorm';

export class templatesSetPolicy1667631156513 implements MigrationInterface {
  name = 'templatesSetPolicy1667631156513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD \`policy\` text NULL`
    );
    const templatesSets: any[] = await queryRunner.query(
      `SELECT id FROM templates_set`
    );
    for (const templatesSet of templatesSets) {
      const policy = {
        minInnovationFlow: 1,
      };
      await queryRunner.query(
        `UPDATE templates_set SET policy = '${JSON.stringify(
          policy
        )}' WHERE (id = '${templatesSet.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP COLUMN \`policy\``
    );
  }
}
