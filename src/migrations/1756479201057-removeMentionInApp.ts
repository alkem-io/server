import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMentionInApp1756479201057 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // delete all in app notifications where the type is 'USER_MENTION'
    await queryRunner.query(
      `DELETE FROM \`in_app_notification\` WHERE \`type\` = 'USER_MENTION'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
