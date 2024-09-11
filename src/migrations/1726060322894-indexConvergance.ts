import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1726060322894 implements MigrationInterface {
  name = 'Test1726060322894';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `FK_3337f26ca267009fcf514e0e726` ON `document`'
    );
    await queryRunner.query(
      'DROP INDEX `FK_6a30f26ca267009fcf514e0e726` ON `calendar_event`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_0f03c61020ea0dfa0198c60304` ON `activity`'
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_0f03c61020ea0dfa0198c60304` ON `activity` (`rowId`)'
    );
    await queryRunner.query(`
      UPDATE \`space\`
      SET \`visibility\` = 'demo'
      WHERE \`visibility\` IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`space\`
      MODIFY \`visibility\` varchar(128) NOT NULL
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX `REL_96a8cbe1706f459fd7d883be9b` ON `innovation_flow` (`profileId`)'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_96a8cbe1706f459fd7d883be9bd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` ADD CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_fe50118fd82e7fe2f74f986a195`'
    );
    await queryRunner.query(
      'ALTER TABLE `application_questions` DROP FOREIGN KEY `FK_8495fae86f13836b0745642baa8`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` DROP FOREIGN KEY `FK_96a8cbe1706f459fd7d883be9bd`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_0f03c61020ea0dfa0198c60304` ON `activity`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_96a8cbe1706f459fd7d883be9b` ON `innovation_flow`'
    );
    await queryRunner.query(`
      ALTER TABLE \`space\`
      MODIFY \`visibility\` varchar(36) NULL
    `);
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` DROP INDEX `IDX_96a8cbe1706f459fd7d883be9b`'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_0f03c61020ea0dfa0198c60304` ON `activity` (`rowId`)'
    );
    await queryRunner.query(
      'CREATE INDEX `FK_6a30f26ca267009fcf514e0e726` ON `calendar_event` (`createdBy`)'
    );
    await queryRunner.query(
      'CREATE INDEX `FK_3337f26ca267009fcf514e0e726` ON `document` (`createdBy`)'
    );
  }
}
