import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHomeSpaceToUserSettings1768490929721
  implements MigrationInterface
{
  name = 'AddHomeSpaceToUserSettings1768490929721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD "homeSpace" jsonb NOT NULL DEFAULT '{"spaceID": null, "autoRedirect": false}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN "homeSpace"`
    );
  }
}
