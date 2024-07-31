import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceVisibility1721830892863 implements MigrationInterface {
  name = 'SpaceVisibility1721830892863';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `space` ADD `visibility` varchar(36) NULL'
    );

    // Drop the foreign key constraint on License
    await queryRunner.query(
      `ALTER TABLE \`license\` DROP FOREIGN KEY \`FK_bfd01743815f0dd68ac1c5c45c0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_8339e62882f239dc00ff5866f8c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`feature_flag\` DROP FOREIGN KEY \`FK_7e3e0a8b6d3e9b4a3a0d6e3a3e3\``
    );

    const spaces: {
      id: string;
      accountId: string;
      level: number;
    }[] = await queryRunner.query(`SELECT id, accountId, level FROM \`space\``);
    for (const space of spaces) {
      const [account]: {
        id: string;
        licenseId: string;
      }[] = await queryRunner.query(
        `SELECT id, licenseId FROM account WHERE id = '${space.accountId}'`
      );
      if (account) {
        const [license]: {
          id: string;
          visibility: string;
        }[] = await queryRunner.query(
          `SELECT id, visibility FROM license WHERE id = '${account.licenseId}'`
        );
        if (license) {
          await queryRunner.query(
            `UPDATE \`space\` SET visibility = '${license.visibility}' WHERE id = '${space.id}'`
          );
        } else {
          console.log(`No license found for account ${account.id}`);
        }
      } else {
        console.log(`No root space found for account ${space.id}`);
      }
    }

    const licenses: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`license\``
    );
    for (const license of licenses) {
      // delete the authorization associated with the license
      await queryRunner.query(
        `DELETE FROM authorization_policy WHERE id = '${license.authorizationId}'`
      );
    }
    // Drop License table + column on Account
    await queryRunner.query('ALTER TABLE `account` DROP COLUMN `licenseId`');
    await queryRunner.query('DROP TABLE `license`');
    await queryRunner.query('DROP TABLE `feature_flag`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
