import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixTimeline1674737339410 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`hxb\` CHANGE COLUMN \`timelineID\` \`timelineID\` CHAR(36) NULL, ADD UNIQUE INDEX \`REL_cfe913bad45e399cc0d828ebaf8\` (\`timelineID\`) ;`
    );

    await queryRunner.query(
      'ALTER TABLE `hxb` ADD CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineID`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `hxb` DROP FOREIGN KEY `FK_3005ed9ce3f57c250c59d6d5065`'
    );
    await queryRunner.query(
      'DROP INDEX `REL_cfe913bad45e399cc0d828ebaf8` ON `hxb`'
    );
    await queryRunner.query(
      `ALTER TABLE \`hxb\` CHANGE COLUMN \`timelineID\` \`timelineID\` CHAR(36) NOT NULL;`
    );
  }
}
