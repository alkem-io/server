import { MigrationInterface, QueryRunner } from 'typeorm';

export class fkFix1668714928572 implements MigrationInterface {
  name = 'fkFix1668714928572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_35533901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` MODIFY COLUMN \`policyId\` varchar(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_35533901817dd09d5906537e088\` FOREIGN KEY (\`policyId\`) REFERENCES \`community_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
