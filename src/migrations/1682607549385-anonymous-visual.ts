import { MigrationInterface, QueryRunner } from "typeorm"

export class anonymousVisual1682607549385 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `ALTER TABLE \`document\` ADD \`anonymousReadAccess\` boolean DEFAULT FALSE `
      );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `ALTER TABLE \`document\` DROP COLUMN \`anonymousReadAccess\``
      );
    }

}
