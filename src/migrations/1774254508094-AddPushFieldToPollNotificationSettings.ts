import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushFieldToPollNotificationSettings1774254508094
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The CommunityPolls migration added 4 poll notification types with only
    // {email, inApp}. This migration adds the missing "push" field, mirroring
    // the "inApp" value — consistent with AddPushFieldToNotificationSettings.
    const paths = [
      `'{space,collaborationPollVoteCastOnOwnPoll}'`,
      `'{space,collaborationPollVoteCastOnPollIVotedOn}'`,
      `'{space,collaborationPollModifiedOnPollIVotedOn}'`,
      `'{space,collaborationPollVoteAffectedByOptionChange}'`,
    ];

    for (const path of paths) {
      const pushPath = path.replace(/}'$/, ",push}'");
      await queryRunner.query(`
        UPDATE user_settings
        SET notification = jsonb_set(
          notification,
          ${pushPath}::text[],
          COALESCE(notification #> ${path}::text[] -> 'inApp', 'false'::jsonb)
        )
        WHERE notification #> ${path}::text[] IS NOT NULL
          AND notification #> ${path}::text[] -> 'push' IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const paths = [
      `'{space,collaborationPollVoteCastOnOwnPoll}'`,
      `'{space,collaborationPollVoteCastOnPollIVotedOn}'`,
      `'{space,collaborationPollModifiedOnPollIVotedOn}'`,
      `'{space,collaborationPollVoteAffectedByOptionChange}'`,
    ];

    for (const path of paths) {
      const pushPath = path.replace(/}'$/, ",push}'");
      await queryRunner.query(`
        UPDATE user_settings
        SET notification = notification #- ${pushPath}::text[]
        WHERE notification #> ${path}::text[] IS NOT NULL
          AND notification #> ${path}::text[] -> 'push' IS NOT NULL
      `);
    }
  }
}
