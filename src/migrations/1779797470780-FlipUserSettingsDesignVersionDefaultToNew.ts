import { MigrationInterface, QueryRunner } from 'typeorm';

export class FlipUserSettingsDesignVersionDefaultToNew1779797470780
  implements MigrationInterface
{
  name = 'FlipUserSettingsDesignVersionDefaultToNew1779797470780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ALTER COLUMN "designVersion" SET DEFAULT 2`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ALTER COLUMN "designVersion" SET DEFAULT 1`
    );
  }
}
