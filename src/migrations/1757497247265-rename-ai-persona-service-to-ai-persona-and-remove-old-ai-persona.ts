import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAiPersonaServiceToAiPersonaAndRemoveOldAiPersona1757497247265
  implements MigrationInterface
{
  name = 'RenameAiPersonaServiceToAiPersonaAndRemoveOldAiPersona1757497247265';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`aiPersonaID_tmp\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`description\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`dataAccessMode\` varchar(128) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`interactionModes\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`bodyOfKnowledge\` text NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`bodyOfKnowledge\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`interactionModes\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`dataAccessMode\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`description\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`aiPersonaID\``
    );
  }
}
