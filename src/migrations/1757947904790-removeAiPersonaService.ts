import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAiPersonaService1757947904790 implements MigrationInterface {
  name = 'RemoveAiPersonaService1757947904790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_55b8101bdf4f566645e928c26e3\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`aiPersonaID_tmp\` char(36) NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`dataAccessMode\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`interactionModes\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`bodyOfKnowledgeType\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP FOREIGN KEY \`FK_409cc6ee5429588f868cd59a1de\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` CHANGE \`knowledgeBaseId\` \`knowledgeBaseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_409cc6ee5429588f868cd59a1de\` FOREIGN KEY (\`knowledgeBaseId\`) REFERENCES \`knowledge_base\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`bodyOfKnowledgeDescription\` text NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`bodyOfKnowledgeID\` varchar(128) NULL`
    );

    await queryRunner.query(`
      UPDATE \`virtual_contributor\` vc
      LEFT JOIN \`ai_persona\` ap ON vc.aiPersonaId = ap.id
      LEFT JOIN \`ai_persona_service\` aps ON ap.aiPersonaServiceID = aps.id
      SET
        vc.aiPersonaID_tmp = ap.aiPersonaServiceID,
        vc.dataAccessMode = ap.dataAccessMode,
        vc.interactionModes = ap.interactionModes,
        vc.bodyOfKnowledgeType = aps.bodyOfKnowledgeType,
        vc.bodyOfKnowledgeDescription = ap.bodyOfKnowledge,
        vc.bodyOfKnowledgeID = aps.bodyOfKnowledgeID
    `);

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`aiPersonaId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` CHANGE \`aiPersonaID_tmp\` \`aiPersonaID\` char(36) NOT NULL`
    );

    await queryRunner.query(`
      DROP TABLE IF EXISTS \`ai_persona\`;
    `);
    await queryRunner.query(`
      RENAME TABLE ai_persona_service TO ai_persona;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
