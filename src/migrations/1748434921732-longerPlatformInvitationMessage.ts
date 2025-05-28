import { MigrationInterface, QueryRunner } from 'typeorm';

export class LongerPlatformInvitationMessage1748434921732
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` MODIFY `welcomeMessage` varchar(8192) NULL'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `platform_invitation` MODIFY `welcomeMessage` varchar(255) NULL'
    );
  }
}
