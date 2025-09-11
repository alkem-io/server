import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiPersonaFields1757579978770 implements MigrationInterface {
  name = 'AddAiPersonaFields1757579978770';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP FOREIGN KEY \`FK_79206feb0038b1c5597668dc4b5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP FOREIGN KEY \`FK_b9f20da98058d7bd474152ed6ce\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_79206feb0038b1c5597668dc4b\` ON \`ai_persona\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD \`description\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD \`interactionModes\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD \`bodyOfKnowledge\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD UNIQUE INDEX \`IDX_293f0d3ef60cb0ca0006044ecf\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` ON \`ai_persona\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_293f0d3ef60cb0ca0006044ecfd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_7460caf8dad74c0a302af76b1d5\` FOREIGN KEY (\`aiServerId\`) REFERENCES \`ai_server\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP FOREIGN KEY \`FK_7460caf8dad74c0a302af76b1d5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP FOREIGN KEY \`FK_293f0d3ef60cb0ca0006044ecfd\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` ON \`ai_persona\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP INDEX \`IDX_293f0d3ef60cb0ca0006044ecf\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP COLUMN \`bodyOfKnowledge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP COLUMN \`interactionModes\``
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` DROP COLUMN \`description\``
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_79206feb0038b1c5597668dc4b\` ON \`ai_persona\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_b9f20da98058d7bd474152ed6ce\` FOREIGN KEY (\`aiServerId\`) REFERENCES \`ai_server\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_79206feb0038b1c5597668dc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
