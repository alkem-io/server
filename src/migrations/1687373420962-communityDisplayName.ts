import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityDisplayName1687373420962 implements MigrationInterface {
  name = 'communityDisplayName1687373420962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`displayName\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` ADD `displayName` varchar(255) NULL'
    );
    // add back in the actual value via lookup for profile to use for a community
    // Update existing community entries to set the type properly
    const communities: { id: string; type: string }[] = await queryRunner.query(
      `SELECT id, type FROM community`
    );
    for (const community of communities) {
      const journeys: { id: string; profileId: string }[] =
        await queryRunner.query(
          `SELECT id, profileId FROM ${community.type}  WHERE communityId='${community.id}'`
        );
      if (journeys.length !== 1) continue;
      const journey = journeys[0];
      const profiles: { id: string; displayName: string }[] =
        await queryRunner.query(
          `SELECT id, displayName FROM profile  WHERE id='${journey.profileId}'`
        );

      if (profiles.length !== 1) continue;
      const displayName = profiles[0].displayName;

      await queryRunner.query(
        `UPDATE community SET displayName='${displayName}' WHERE id='${community.id}'`
      );
    }
  }
}
