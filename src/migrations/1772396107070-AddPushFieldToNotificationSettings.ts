import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushFieldToNotificationSettings1772396107070
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add "push" field mirroring "inApp" value to every leaf node in the notification JSONB column.
    // The JSONB structure has 5 top-level categories, each containing nested objects
    // whose leaf nodes are {email: boolean, inApp: boolean}. We add {push: <inApp value>}.
    const paths = [
      // organization
      `'{organization,adminMessageReceived}'`,
      `'{organization,adminMentioned}'`,
      // platform
      `'{platform,forumDiscussionCreated}'`,
      `'{platform,forumDiscussionComment}'`,
      `'{platform,admin,userProfileCreated}'`,
      `'{platform,admin,userProfileRemoved}'`,
      `'{platform,admin,spaceCreated}'`,
      `'{platform,admin,userGlobalRoleChanged}'`,
      // space
      `'{space,admin,communityApplicationReceived}'`,
      `'{space,admin,communityNewMember}'`,
      `'{space,admin,communicationMessageReceived}'`,
      `'{space,admin,collaborationCalloutContributionCreated}'`,
      `'{space,communicationUpdates}'`,
      `'{space,collaborationCalloutContributionCreated}'`,
      `'{space,collaborationCalloutPostContributionComment}'`,
      `'{space,collaborationCalloutComment}'`,
      `'{space,collaborationCalloutPublished}'`,
      `'{space,communityCalendarEvents}'`,
      // user
      `'{user,mentioned}'`,
      `'{user,commentReply}'`,
      `'{user,messageReceived}'`,
      `'{user,membership,spaceCommunityInvitationReceived}'`,
      `'{user,membership,spaceCommunityJoined}'`,
      // virtualContributor
      `'{virtualContributor,adminSpaceCommunityInvitation}'`,
    ];

    for (const path of paths) {
      // For each leaf node, set "push" to the current "inApp" value.
      // jsonb_set adds the key if it doesn't exist.
      // Build the full path to the "push" key by replacing the closing brace with ",push}".
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
    // Remove "push" field from every leaf node
    const paths = [
      `'{organization,adminMessageReceived}'`,
      `'{organization,adminMentioned}'`,
      `'{platform,forumDiscussionCreated}'`,
      `'{platform,forumDiscussionComment}'`,
      `'{platform,admin,userProfileCreated}'`,
      `'{platform,admin,userProfileRemoved}'`,
      `'{platform,admin,spaceCreated}'`,
      `'{platform,admin,userGlobalRoleChanged}'`,
      `'{space,admin,communityApplicationReceived}'`,
      `'{space,admin,communityNewMember}'`,
      `'{space,admin,communicationMessageReceived}'`,
      `'{space,admin,collaborationCalloutContributionCreated}'`,
      `'{space,communicationUpdates}'`,
      `'{space,collaborationCalloutContributionCreated}'`,
      `'{space,collaborationCalloutPostContributionComment}'`,
      `'{space,collaborationCalloutComment}'`,
      `'{space,collaborationCalloutPublished}'`,
      `'{space,communityCalendarEvents}'`,
      `'{user,mentioned}'`,
      `'{user,commentReply}'`,
      `'{user,messageReceived}'`,
      `'{user,membership,spaceCommunityInvitationReceived}'`,
      `'{user,membership,spaceCommunityJoined}'`,
      `'{virtualContributor,adminSpaceCommunityInvitation}'`,
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
