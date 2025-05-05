import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueFields1745504773410 implements MigrationInterface {
  name = 'UniqueFields1745504773410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Combined update: set accountUpn to email for all cases in one query
    await queryRunner.query(`
      UPDATE \`user\`
      SET \`accountUpn\` = \`email\`
      WHERE \`accountUpn\` IS NULL OR \`accountUpn\` = '' OR \`accountUpn\` <> \`email\`;
    `);
    await queryRunner.query(
      'ALTER TABLE `user` ADD UNIQUE INDEX `IDX_ad8730bcd46ca67fb2d1edd756` (`nameID`)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD UNIQUE INDEX `IDX_c09b537a5d76200c622a0fd0b7` (`accountUpn`)'
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD UNIQUE INDEX `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`)'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` ADD UNIQUE INDEX `IDX_d11fdb37a7b736d053b762b27c` (`nameID`)'
    );
    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` ADD UNIQUE INDEX `IDX_d068ef33a6752b8a48839b89d4` (`nameID`)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `virtual_contributor` DROP INDEX `IDX_d068ef33a6752b8a48839b89d4`'
    );
    await queryRunner.query(
      'ALTER TABLE `organization` DROP INDEX `IDX_d11fdb37a7b736d053b762b27c`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP INDEX `IDX_e12875dfb3b1d92d7d7c5377e2`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP INDEX `IDX_c09b537a5d76200c622a0fd0b7`'
    );
    await queryRunner.query(
      'ALTER TABLE `user` DROP INDEX `IDX_ad8730bcd46ca67fb2d1edd756`'
    );
  }
}
