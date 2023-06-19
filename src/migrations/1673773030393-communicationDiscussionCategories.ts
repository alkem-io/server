import { MigrationInterface, QueryRunner } from 'typeorm';

enum CommunityCategory {
  GENERAL = 'general',
  IDEAS = 'ideas',
  QUESTIONS = 'questions',
  SHARING = 'sharing',
}

enum PlatformCategory {
  PLATFORM_FUNCTIONALITIES = 'platform-functionalities',
  COMMUNITY_BUILDING = 'community-building',
  CHALLENGE_CENTRIC = 'challenge-centric',
  HELP = 'help',
  OTHER = 'other',
}

export class communicationDiscussionCategories1673773030393
  implements MigrationInterface
{
  name = 'communicationDiscussionCategories1673773030393';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD \`discussionCategories\` text NULL`
    );

    const communications: { id: string; hxbID: string }[] =
      await queryRunner.query(`SELECT id, hxbID FROM communication`);
    for (const communication of communications) {
      let categories: string[] = [
        CommunityCategory.GENERAL,
        CommunityCategory.IDEAS,
        CommunityCategory.QUESTIONS,
        CommunityCategory.SHARING,
      ];
      if (communication.hxbID === 'platform') {
        categories = [
          PlatformCategory.PLATFORM_FUNCTIONALITIES,
          PlatformCategory.COMMUNITY_BUILDING,
          PlatformCategory.CHALLENGE_CENTRIC,
          PlatformCategory.HELP,
          PlatformCategory.OTHER,
        ];
      }
      await queryRunner.query(
        `UPDATE communication SET discussionCategories = '${categories}' WHERE (id = '${communication.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP COLUMN \`discussionCategories\``
    );
  }
}
