import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixVcFeatureFlags1713255211876 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const licenses: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM license`);

    for (const license of licenses) {
      const existingFeatureFlag = await queryRunner.query(
        `SELECT * FROM feature_flag WHERE licenseId = '${license.id}' AND name = 'virtual-contributors'`
      );

      if (!existingFeatureFlag.length) {
        const featureFlagUUID = randomUUID();
        await queryRunner.query(
          `INSERT INTO feature_flag (id, version, licenseId, name, enabled) VALUES
                            ('${featureFlagUUID}',
                            1,
                            '${license.id}',
                            'virtual-contributors',
                            0)`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
