import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkToFraming1754384352785 implements MigrationInterface {
  name = 'LinkToFraming1754384352785';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD \`linkId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD UNIQUE INDEX \`IDX_c3eee1b0c21294874daec15ad5\` (\`linkId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c3eee1b0c21294874daec15ad5\` ON \`callout_framing\` (\`linkId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_c3eee1b0c21294874daec15ad59\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_c3eee1b0c21294874daec15ad59\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c3eee1b0c21294874daec15ad5\` ON \`callout_framing\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_c3eee1b0c21294874daec15ad5\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP COLUMN \`linkId\``
    );
  }
}
