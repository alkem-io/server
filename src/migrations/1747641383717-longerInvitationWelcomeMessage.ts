import { MigrationInterface, QueryRunner } from 'typeorm';

export class LongerInvitationWelcomeMessage1747641383717
  implements MigrationInterface
{
  name = 'LongerInvitationWelcomeMessage1747641383717';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `invitation` MODIFY `welcomeMessage` varchar(8192) NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `invitation` MODIFY `welcomeMessage` varchar(512) NULL'
    );
  }
}
