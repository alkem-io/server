import { MigrationInterface, QueryRunner } from 'typeorm';

export class LevelZeroSpace1756377641976 implements MigrationInterface {
  name = 'LevelZeroSpace1756377641976';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_30ae8b3beae657ffe8f835c7222\` FOREIGN KEY (\`levelZeroSpaceID\`) REFERENCES \`space\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_30ae8b3beae657ffe8f835c7222\``
    );
  }
}
