import { MigrationInterface, QueryRunner } from 'typeorm';

export class collaboration21620675866032 implements MigrationInterface {
  name = 'collaboration21620675866032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_fa617e79d6b2926edc7b4a3878f`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_fa617e79d6b2926edc7b4a3878` ON `opportunity`'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_fa617e79d6b2926edc7b4a3878f` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `opportunity` DROP FOREIGN KEY `FK_fa617e79d6b2926edc7b4a3878f`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_fa617e79d6b2926edc7b4a3878` ON `opportunity` (`collaborationId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `opportunity` ADD CONSTRAINT `FK_fa617e79d6b2926edc7b4a3878f` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
