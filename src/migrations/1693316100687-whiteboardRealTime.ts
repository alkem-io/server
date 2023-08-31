import { MigrationInterface, QueryRunner } from 'typeorm';

export class whiteboardRealTime1693316100687 implements MigrationInterface {
  name = 'whiteboardRealTime1693316100687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `whiteboard_rt` (`id` char(36) NOT NULL, `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `version` int NOT NULL, `nameID` varchar(255) NOT NULL, `content` longtext NOT NULL, `createdBy` char(36) NULL, `authorizationId` char(36) NULL, `profileId` char(36) NULL, `calloutId` char(36) NULL, UNIQUE INDEX `REL_60e34af57347a7d391bc598568` (`authorizationId`), UNIQUE INDEX `REL_9dd2273a4105bd6ed536fe4913` (`profileId`), PRIMARY KEY (`id`)) ENGINE=InnoDB'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` ADD CONSTRAINT `FK_60e34af57347a7d391bc5985681` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` ADD CONSTRAINT `FK_9dd2273a4105bd6ed536fe49138` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` ADD CONSTRAINT `FK_bfbbf57f3c79e6774f90d32707c` FOREIGN KEY (`calloutId`) REFERENCES `callout`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`whiteboardRtId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD UNIQUE INDEX \`IDX_c7c005697d999f2b836052f496\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c7c005697d999f2b836052f496\` ON \`callout\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      'ALTER TABLE `callout` ADD CONSTRAINT `FK_c7c005697d999f2b836052f4967` FOREIGN KEY (`whiteboardRtId`) REFERENCES `whiteboard_rt`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `callout` DROP FOREIGN KEY `FK_c7c005697d999f2b836052f4967`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_c7c005697d999f2b836052f496` ON `callout`'
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP INDEX \`IDX_c7c005697d999f2b836052f496\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`whiteboardRtId\``
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` DROP FOREIGN KEY `FK_bfbbf57f3c79e6774f90d32707c`'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` DROP FOREIGN KEY `FK_9dd2273a4105bd6ed536fe49138`'
    );
    await queryRunner.query(
      'ALTER TABLE `whiteboard_rt` DROP FOREIGN KEY `FK_60e34af57347a7d391bc5985681`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_9dd2273a4105bd6ed536fe4913` ON `whiteboard_rt`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_60e34af57347a7d391bc598568` ON `whiteboard_rt`'
    );
    await queryRunner.query('DROP TABLE `whiteboard_rt`');
  }
}
