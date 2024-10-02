import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1727872794564 implements MigrationInterface {
  name = 'Test1727872794564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `FK_b3d3f3c2ce851d1059c4ed26ba2` ON `platform_invitation`'
    );
    await queryRunner.query(
      'DROP INDEX `FK_500cee6f635849f50e19c7e2b76` ON `application`'
    );
    await queryRunner.query(
      'DROP INDEX `FK_339c1fe2a9c5caef5b982303fb0` ON `invitation`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `FK_339c1fe2a9c5caef5b982303fb0` ON `invitation` (`roleSetId`)'
    );
    await queryRunner.query(
      'CREATE INDEX `FK_500cee6f635849f50e19c7e2b76` ON `application` (`roleSetId`)'
    );
    await queryRunner.query(
      'CREATE INDEX `FK_b3d3f3c2ce851d1059c4ed26ba2` ON `platform_invitation` (`roleSetId`)'
    );
  }
}
