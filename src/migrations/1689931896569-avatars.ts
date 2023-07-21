import { MigrationInterface, QueryRunner } from 'typeorm';

export class avatars1689931896569 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const challenges: {
      profileId: string;
    }[] = await queryRunner.query(`SELECT profileId FROM challenge`);
    for (const challenge of challenges) {
      await this.addAvatar(queryRunner, challenge.profileId);
    }

    const opportunities: {
      profileId: string;
    }[] = await queryRunner.query(`SELECT profileId FROM opportunity`);
    for (const opportunity of opportunities) {
      await this.addAvatar(queryRunner, opportunity.profileId);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Migration 'avatars1689931896569' is not revertible. Please make sure you have a backup of your data before running this migration."
    );
  }

  private async addAvatar(queryRunner: QueryRunner, profileId: string) {
    const visuals: { uri: string }[] = await queryRunner.query(
      `SELECT uri FROM visual WHERE (profileId = '${profileId}') AND name = 'bannerNarrow'`
    );
    const visual = visuals[0];
    if (visual.uri === '') return;

    await queryRunner.query(
      `UPDATE visual SET uri = '${visual.uri}' WHERE uri = '' AND name = 'avatar' AND profileId = '${profileId}'`
    );
  }
}
