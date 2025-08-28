import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInAppCategory1756372316381 implements MigrationInterface {
  name = 'FixInAppCategory1756372316381';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // fix baseline
    await queryRunner.query(
      `DROP INDEX \`IDX_c3eee1b0c21294874daec15ad5\` ON \`callout_framing\``
    );

    // Update all the categories to match the NotificationEventCategory values
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'space_member' WHERE \`category\` = 'space-member'`
    );
    await queryRunner.query(
      `UPDATE \`in_app_notification\` SET \`category\` = 'space_admin' WHERE \`category\` = 'space-admin'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
