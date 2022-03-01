import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityTypeParentid1635431556279 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `community` ADD `type` varchar(16) NOT NULL'
    );
    await queryRunner.query(
      'ALTER TABLE `community` ADD `parentID` varchar(36) NOT NULL'
    );

    await queryRunner.query(
      `update community as com
            inner join opportunity as opp on com.id = opp.communityId
            set com.type = 'opportunity', com.parentID = opp.id`
    );

    await queryRunner.query(
      `update community as com
            inner join challenge as ch on com.id = ch.communityId
            set com.type = 'challenge', com.parentID = ch.id`
    );

    await queryRunner.query(
      `update community as com
            inner join ecoverse as eco on com.id = eco.communityId
            set com.type = 'ecoverse', com.parentID = eco.id`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `community` DROP COLUMN `parentID`');
    await queryRunner.query('ALTER TABLE `community` DROP type `parentID`');
  }
}
