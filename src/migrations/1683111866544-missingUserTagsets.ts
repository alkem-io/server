import { MigrationInterface, QueryRunner } from 'typeorm';
import { createTagset } from './utils/create-tagset';

enum RestrictedTagsetNames {
  DEFAULT = 'default',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

export class missingUserTagsets1683111866544 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const userProfileIdsWithoutTagsets: { profileId: string }[] =
      await queryRunner.query(`
            SELECT user.profileId FROM user
            LEFT JOIN tagset ON user.profileId = tagset.profileId
            WHERE tagset.profileId IS NULL
        `);

    for (const { profileId } of userProfileIdsWithoutTagsets) {
      await createTagset(queryRunner, {
        name: RestrictedTagsetNames.SKILLS,
        profileId,
      });
      await createTagset(queryRunner, {
        name: RestrictedTagsetNames.KEYWORDS,
        profileId,
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
