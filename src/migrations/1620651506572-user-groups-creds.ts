import { MigrationInterface, QueryRunner } from 'typeorm';

export class userGroupsCreds1620651506572 implements MigrationInterface {
  name = 'userGroupsCreds1620651506572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_b61c694cacfab25533bd23d9ad` ON `user`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b61c694cacfab25533bd23d9ad` ON `user` (`agentId`)'
    );
  }
}
