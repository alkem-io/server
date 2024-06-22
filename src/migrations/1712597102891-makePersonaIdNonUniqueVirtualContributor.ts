import { MigrationInterface, QueryRunner } from 'typeorm';

export class makePersonaIdNonUniqueVirtualContributor1712597102891
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE virtual_contributor DROP CONSTRAINT FK_5c6f158a128406aafb9808b3a82`
    );
    await queryRunner.query(
      `ALTER TABLE virtual_contributor DROP INDEX REL_5c6f158a128406aafb9808b3a8`
    );
    await queryRunner.query(
      `ALTER TABLE virtual_contributor ADD INDEX REL_5c6f158a128406aafb9808b3a8 (virtualPersonaId)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_5c6f158a128406aafb9808b3a82\` FOREIGN KEY (\`virtualPersonaId\`) REFERENCES \`virtual_persona\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE virtual_contributor DROP CONSTRAINT FK_5c6f158a128406aafb9808b3a82`
    );
    await queryRunner.query(
      `ALTER TABLE virtual_contributor DROP INDEX REL_5c6f158a128406aafb9808b3a8`
    );
    await queryRunner.query(
      `ALTER TABLE virtual_contributor ADD UNIQUE INDEX REL_5c6f158a128406aafb9808b3a8 (virtualPersonaId)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_5c6f158a128406aafb9808b3a82\` FOREIGN KEY (\`virtualPersonaId\`) REFERENCES \`virtual_persona\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
