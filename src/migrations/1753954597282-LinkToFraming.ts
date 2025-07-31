import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkToFraming1753954597282 implements MigrationInterface {
  name = 'LinkToFraming1753954597282';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add linkId column to callout_framing table
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD \`linkId\` char(36) NULL`
    );

    // Add unique constraint for linkId
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`REL_callout_framing_linkId\` (\`linkId\`)`
    );

    // Add foreign key constraint for linkId
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_callout_framing_linkId\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_callout_framing_linkId\``
    );

    // Drop unique constraint
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`REL_callout_framing_linkId\``
    );

    // Drop linkId column
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP COLUMN \`linkId\``
    );
  }
}
