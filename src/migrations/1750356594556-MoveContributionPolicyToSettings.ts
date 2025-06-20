import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveContributionPolicyToSettings1750356594556 implements MigrationInterface {
  name = 'MoveContributionPolicyToSettings1750356594556'

  public async up(queryRunner: QueryRunner): Promise<void> {
    //await queryRunner.query(`ALTER TABLE \`callout_settings\` ADD \`contributionId\` char(36) NULL`);
    await queryRunner.query(`CREATE TABLE \`callout_settings_contribution\`
      (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL,
      \`allowedTypes\` text NOT NULL,
      \`enabled\` tinyint NOT NULL DEFAULT 1,
      \`canAddContributions\` varchar(128) NOT NULL DEFAULT 'none',
      \`commentsEnabled\` tinyint NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`
      INSERT INTO \`callout_settings_contribution\` (\`id\`, \`createdDate\`, \`updatedDate\`, \`version\`,
      \`allowedTypes\`, \`enabled\`, \`canAddContributions\`, \`commentsEnabled\`)
      SELECT
        callout_contribution_policy.id,
        callout_contribution_policy.createdDate,
        callout_contribution_policy.updatedDate,
        callout_contribution_policy.version,
        allowedContributionTypes as allowedTypes,
        CASE
          WHEN callout_contribution_policy.state = 'open' THEN 1
          WHEN callout_contribution_policy.state = 'closed' THEN 0
          ELSE 1
        END AS \`enabled\`,
        CASE
          WHEN callout_contribution_policy.state = 'open' THEN 'members'
          WHEN callout_contribution_policy.state = 'closed' THEN 'none'
          ELSE 'none'
        END AS \`canAddContributions\`,
        CASE
          WHEN callout.type = 'post-collection' THEN 1
          ELSE 0
        END AS \`commentsEnabled\`
       FROM \`callout_contribution_policy\` JOIN
          \`callout\` ON \`callout\`.\`contributionPolicyId\` =  \`callout_contribution_policy\`.\`id\``);

    await queryRunner.query(`UPDATE \`callout_settings\` SET \`contributionId\` =
      (SELECT \`contributionPolicyId\` FROM \`callout\` WHERE \`callout_settings\`.\`id\` = \`callout\`.\`settingsId\`)`);

    await queryRunner.query(`ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``);
    await queryRunner.query(`DROP INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\``);
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`contributionPolicyId\``);

    await queryRunner.query(`DROP TABLE \`callout_contribution_policy\``);

    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_03f9b3e126314ef81473ced556\` ON \`callout_settings\` (\`contributionId\`)`);
    await queryRunner.query(`ALTER TABLE \`callout_settings\` ADD CONSTRAINT \`FK_03f9b3e126314ef81473ced5568\` FOREIGN KEY (\`contributionId\`) REFERENCES \`callout_settings_contribution\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`UPDATE \`callout_settings_contribution\` SET \`canAddContributions\` = 'none'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`callout_settings\` DROP FOREIGN KEY \`FK_03f9b3e126314ef81473ced5568\``);
    await queryRunner.query(`DROP INDEX \`REL_03f9b3e126314ef81473ced556\` ON \`callout_settings\``);

    await queryRunner.query(`ALTER TABLE \`callout\` ADD \`contributionPolicyId\` char(36) NULL`);

    await queryRunner.query(`UPDATE \`callout\` SET \`contributionPolicyId\` =
      (SELECT \`contributionId\` FROM \`callout_settings\` WHERE \`callout_settings\`.\`id\` = \`callout\`.\`settingsId\`)`);

    await queryRunner.query(`CREATE TABLE \`callout_contribution_policy\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`allowedContributionTypes\` text NOT NULL, \`state\` varchar(128) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`
      INSERT INTO \`callout_contribution_policy\` (\`id\`, \`createdDate\`, \`updatedDate\`, \`version\`, \`allowedContributionTypes\`, \`state\`)
      SELECT \`id\`, \`createdDate\`, \`updatedDate\`, \`version\`,
        \`allowedTypes\` as \`allowedContributionTypes\`,
          CASE
            WHEN \`enabled\` = 1 THEN 'open'
            WHEN \`enabled\` = 0 THEN 'closed'
            ELSE 'open'
          END AS \`state\`
      FROM \`callout_settings_contribution\``);

    await queryRunner.query(`ALTER TABLE \`callout_settings\` DROP COLUMN \`contributionId\``);

    await queryRunner.query(`DROP TABLE \`callout_settings_contribution\``);

    await queryRunner.query(`CREATE UNIQUE INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\` (\`contributionPolicyId\`)`);
    await queryRunner.query(`ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
  }
}
