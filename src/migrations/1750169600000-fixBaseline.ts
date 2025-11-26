import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBaseline1750169600000 implements MigrationInterface {
  name = 'FixBaseline1750169600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_cbe03a4e82a555fe315271ca9f8\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cbe03a4e82a555fe315271ca9f\` ON \`template\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_cbe03a4e82a555fe315271ca9f\` ON \`template\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD UNIQUE INDEX \`IDX_dc4f33c8d24ef7a8af59aafc8b\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_dc4f33c8d24ef7a8af59aafc8b\` ON \`template\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_dc4f33c8d24ef7a8af59aafc8b3\` FOREIGN KEY (\`contentSpaceId\`) REFERENCES \`template_content_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_dc4f33c8d24ef7a8af59aafc8b\` ON \`template\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_dc4f33c8d24ef7a8af59aafc8b\` ON \`template\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_dc4f33c8d24ef7a8af59aafc8b3\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dc4f33c8d24ef7a8af59aafc8b\` ON \`template\``
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP INDEX \`IDX_dc4f33c8d24ef7a8af59aafc8b\``
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_cbe03a4e82a555fe315271ca9f\` ON \`template\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_cbe03a4e82a555fe315271ca9f\` ON \`template\` (\`contentSpaceId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_cbe03a4e82a555fe315271ca9f8\` FOREIGN KEY (\`contentSpaceId\`) REFERENCES \`template_content_space\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
