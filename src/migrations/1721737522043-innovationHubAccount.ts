import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationHubAccount1721737522043 implements MigrationInterface {
  name = 'InnovationHubAccount1721737522043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily remove the constraint
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` DROP CONSTRAINT `FK_156fd30246eb151b9d17716abf5`'
    );

    // Remove uniqueness of accountId index: Just copied from accountInnovationHub1715936821326
    await queryRunner.query(
      'DROP INDEX `REL_156fd30246eb151b9d17716abf` ON `innovation_hub`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` DROP INDEX `IDX_156fd30246eb151b9d17716abf`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD INDEX `IDX_156fd30246eb151b9d17716abf` (`accountId`)'
    );
    await queryRunner.query(
      'CREATE INDEX `REL_156fd30246eb151b9d17716abf` ON `innovation_hub` (`accountId`)'
    );

    // Add the two new columns
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`listedInStore\` tinyint NOT NULL DEFAULT(1)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`
    );

    // All existing innovation hubs to default to be public + listed
    await queryRunner.query(
      `UPDATE innovation_hub SET listedInStore = '1', searchVisibility = 'public';`
    );

    // Find the account that will host all innovation hubs that don't have an account already
    const innovationHubs = await queryRunner.query(
      `SELECT id FROM \`innovation_hub\``
    );
    if (innovationHubs.length > 0) {
      const defaultHostAccount = await this.getDefaultHostAccount(queryRunner);
      console.log(`Default host account: ${defaultHostAccount}`);
      await queryRunner.query(
        `UPDATE innovation_hub SET accountId = '${defaultHostAccount}' WHERE accountId IS NULL;`
      );
    }

    // Make accountId not nullable
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`accountId\` varchar(36) NOT NULL;`
    );

    // Add the constraint back
    await queryRunner.query(
      'ALTER TABLE `innovation_hub` ADD CONSTRAINT `FK_156fd30246eb151b9d17716abf5` FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP COLUMN \`listedInStore\``
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` DROP COLUMN  \`searchVisibility\``
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_hub\` MODIFY \`accountId\` varchar(36) NOT NULL;`
    );
  }

  private async getDefaultHostAccount(
    queryRunner: QueryRunner
  ): Promise<string> {
    const orgNamePattern = '%Alkemio%';
    let result = await queryRunner.query(
      `SELECT account.id as id FROM credential
        JOIN account ON credential.resourceID = account.id
        JOIN organization ON credential.agentId = organization.agentId
        JOIN profile ON organization.profileId = profile.id
      WHERE credential.type = 'account-host' AND profile.displayName LIKE ?`,
      [orgNamePattern]
    );

    if (!result || result.length === 0) {
      result = await queryRunner.query(
        `SELECT account.id as id FROM credential
          JOIN account ON credential.resourceID = account.id
          JOIN organization ON credential.agentId = organization.agentId
        WHERE credential.type = 'account-host' LIMIT 1`
      );

      if (!result || result.length === 0) {
        throw new Error(`No account-host credentials found.`);
      }
    }

    return result[0].id;
  }
}
