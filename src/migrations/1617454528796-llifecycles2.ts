import { MigrationInterface, QueryRunner } from 'typeorm';

export class llifecycles21617454528796 implements MigrationInterface {
  name = 'llifecycles21617454528796';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7ec2857c7d8d16432ffca1cb3d` ON `application` (`lifecycleId`)'
    );
  }
}
