import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateAiPersonaServiceData1757498890011
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`virtual_contributor\` vc
      LEFT JOIN \`ai_persona\` ap ON vc.aiPersonaId = ap.id
      SET
        vc.aiPersonaID_tmp = ap.aiPersonaServiceID,
        vc.description = ap.description,
        vc.dataAccessMode = ap.dataAccessMode,
        vc.interactionModes = ap.interactionModes,
        vc.bodyOfKnowledge = ap.bodyOfKnowledge
    `);

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_55b8101bdf4f566645e928c26e3\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`aiPersonaId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` RENAME COLUMN \`aiPersonaID_tmp\` TO \`aiPersonaID\``
    );
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`ai_persona\`;
    `);
    await queryRunner.query(`
      ALTER TABLE ai_persona_service RENAME ai_persona;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to implement down migration as data migration is one-way
  }
}
