import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMentionInApp1756479201057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // delete all in app notifications where the type is 'USER_MENTION' or 'SPACE_COMMUNITY_NEW_MEMBER'
    await queryRunner.query(
      `DELETE FROM \`in_app_notification\` WHERE \`type\` IN ('USER_MENTION', 'SPACE_COMMUNITY_NEW_MEMBER')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
