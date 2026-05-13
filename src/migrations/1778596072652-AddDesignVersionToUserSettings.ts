import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDesignVersionToUserSettings1778596072652
  implements MigrationInterface
{
  name = 'AddDesignVersionToUserSettings1778596072652';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD "designVersion" integer NOT NULL DEFAULT 1`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN "designVersion"`
    );
  }
}
