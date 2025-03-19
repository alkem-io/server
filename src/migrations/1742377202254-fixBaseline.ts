import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBaseline1742377202254 implements MigrationInterface {
  name = 'FixBaseline1742377202254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space_about\` DROP FOREIGN KEY \`FK_3e7dd2fa8c829352cfbecb2cc94\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` ADD UNIQUE INDEX \`IDX_830c5cd4eda4b4ba8e297101c7\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_830c5cd4eda4b4ba8e297101c7\` ON \`space_about\` (\`guidelinesId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` ADD CONSTRAINT \`FK_830c5cd4eda4b4ba8e297101c73\` FOREIGN KEY (\`guidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_830c5cd4eda4b4ba8e297101c7\` ON \`space_about\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space_about\` DROP FOREIGN KEY \`FK_830c5cd4eda4b4ba8e297101c73\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_830c5cd4eda4b4ba8e297101c7\` ON \`space_about\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` DROP INDEX \`IDX_830c5cd4eda4b4ba8e297101c7\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_about\` ADD CONSTRAINT \`FK_3e7dd2fa8c829352cfbecb2cc94\` FOREIGN KEY (\`guidelinesId\`) REFERENCES \`community_guidelines\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_830c5cd4eda4b4ba8e297101c7\` ON \`space_about\` (\`guidelinesId\`)`
    );
  }
}
