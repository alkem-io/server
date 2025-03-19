import { MigrationInterface, QueryRunner } from 'typeorm';

export class FlowStatesCommunityGuidelines1742316907610
  implements MigrationInterface
{
  name = 'FlowStatesCommunityGuidelines1742316907610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE space_about ADD COLUMN guidelinesId char(36) DEFAULT NULL`
    );

    await queryRunner.query(
      'ALTER TABLE `space_about` ADD CONSTRAINT `FK_3e7dd2fa8c829352cfbecb2cc94` FOREIGN KEY (`guidelinesId`) REFERENCES `community_guidelines`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      `UPDATE space_about
        SET guidelinesId = (
         SELECT community.guidelinesId
         FROM space
         JOIN community ON space.communityId = community.id
         WHERE space.aboutId = space_about.id
         )
      `
    );

    await queryRunner.query(
      'ALTER TABLE `community` DROP FOREIGN KEY `FK_2e7dd2fa8c829352cfbecb2cc93`'
    );

    await queryRunner.query(`ALTER TABLE community DROP COLUMN guidelinesId`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE community ADD COLUMN guidelinesId char(36) DEFAULT NULL`
    );

    await queryRunner.query(
      'ALTER TABLE `community` ADD CONSTRAINT `FK_2e7dd2fa8c829352cfbecb2cc93` FOREIGN KEY (`guidelinesId`) REFERENCES `community_guidelines`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      `UPDATE community
        SET guidelinesId = (
         SELECT space_about.guidelinesId
         FROM space
         JOIN space_about ON space.aboutId = space_about.id
         WHERE space.communityId = community.id
         )
      `
    );

    await queryRunner.query(
      'ALTER TABLE `space_about` DROP FOREIGN KEY `FK_3e7dd2fa8c829352cfbecb2cc94`'
    );

    await queryRunner.query(`ALTER TABLE space_about DROP COLUMN guidelinesId`);
  }
}
