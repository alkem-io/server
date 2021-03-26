import { MigrationInterface, QueryRunner } from 'typeorm';

export class userRemovalCascade1616754127498 implements MigrationInterface {
  name = 'userRemovalCascade1616754127498';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `organisation` DROP FOREIGN KEY `FK_037ba4b170844c039e74aa22ecd`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP FOREIGN KEY `FK_9466682df91534dd95e4dbaa616`'
    );
    await queryRunner.query(
      'ALTER TABLE `organisation` ADD CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
