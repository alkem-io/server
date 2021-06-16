import { MigrationInterface, QueryRunner } from 'typeorm';

export class projectDelete1623786132840 implements MigrationInterface {
  name = 'projectDelete1623786132840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_7671a7e33f6665764f4534a596` ON `organisation`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b0c3f360534db92017e36a00bb` ON `ecoverse`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_b025a2720e5ee0e5b38774f7a8` ON `challenge`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_c814aa7dc8a68f27d96d5d1782` ON `opportunity`'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `project` DROP FOREIGN KEY `FK_f425931bb61a95ef6f6d89c9a85`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_c814aa7dc8a68f27d96d5d1782` ON `opportunity` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b025a2720e5ee0e5b38774f7a8` ON `challenge` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_b0c3f360534db92017e36a00bb` ON `ecoverse` (`agentId`)'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_7671a7e33f6665764f4534a596` ON `organisation` (`agentId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
