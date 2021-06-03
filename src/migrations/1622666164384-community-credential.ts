import { MigrationInterface, QueryRunner } from 'typeorm';

export class communityCredential1622666164384 implements MigrationInterface {
  name = 'communityCredential1622666164384';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_56f5614fff0028d40370499582` ON `application`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_56f5614fff0028d40370499582` ON `application` (`authorizationId`)'
    );
  }
}
