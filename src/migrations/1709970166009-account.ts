import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class account1709970166009 implements MigrationInterface {
  name = 'account1709970166009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new structure
    await this.projectAgreementUp(queryRunner);
    await this.challengeHierarchyUp(queryRunner);

    await this.accountUpBeforeData(queryRunner);

    // migrate data
    const spaces: {
      id: string;
      licenseId: string;
      defaultsId: string;
      templatesSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, licenseId, defaultsId, templatesSetId FROM space`
    );
    for (const space of spaces) {
      //
      const accountAuthorizationID = await this.createAuthorization(
        queryRunner
      );
      const accountID = randomUUID();

      await queryRunner.query(
        `INSERT INTO account (id, version, authorizationId, spaceID, licenseId, defaultsId, libraryId) VALUES
                  ('${accountID}', 1, '${accountAuthorizationID}', '${space.id}', '${space.licenseId}', '${space.defaultsId}', '${space.templatesSetId}')`
      );
      await queryRunner.query(
        `UPDATE space SET accountId = '${accountID}' WHERE id = '${space.id}'`
      );
    }
    const challenges: {
      id: string;
      spaceId: string;
    }[] = await queryRunner.query(`SELECT id, spaceId FROM challenge`);
    for (const challenge of challenges) {
      const [space]: {
        id: string;
        accountId: string;
      }[] = await queryRunner.query(
        `SELECT id, accountId FROM space WHERE id = '${challenge.spaceId}'`
      );
      await queryRunner.query(
        `UPDATE challenge SET accountId = '${space.accountId}' WHERE id = '${challenge.id}'`
      );
    }
    const opportunities: {
      id: string;
      spaceID: string;
    }[] = await queryRunner.query(`SELECT id, spaceID FROM opportunity`);
    for (const opportunity of opportunities) {
      const [space]: {
        id: string;
        accountId: string;
      }[] = await queryRunner.query(
        `SELECT id, accountId FROM space WHERE id = '${opportunity.spaceID}'`
      );
      await queryRunner.query(
        `UPDATE opportunity SET accountId = '${space.accountId}' WHERE id = '${opportunity.id}'`
      );
    }

    // add new constraints
    await this.accountUpAfterData(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.projectAgreementDown(queryRunner);
    await this.challengeHierarchyDown(queryRunner);

    await this.accountDownBeforeData(queryRunner);

    // Migrate data
    const spaces: {
      id: string;
      accountId: string;
    }[] = await queryRunner.query(`SELECT id, accountId FROM space`);
    for (const space of spaces) {
      const [account]: {
        id: string;
        defaultsId: string;
        libraryId: string;
        licenseId: string;
      }[] = await queryRunner.query(
        `SELECT id, defaultsId, libraryId, licenseId FROM account WHERE id = '${space.accountId}'`
      );
      await queryRunner.query(
        `UPDATE space SET defaultsId = '${account.defaultsId}', templatesSetId = '${account.libraryId}', licenseId = '${account.licenseId}' WHERE id = '${space.id}'`
      );
    }

    await this.accountDownAfterData(queryRunner);
  }

  private async accountUpBeforeData(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`account\` (\`id\` char(36) NOT NULL,
                                                       \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                       \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                       \`version\` int NOT NULL,
                                                       \`spaceID\` char(36) NOT NULL,
                                                       \`authorizationId\` char(36) NULL,
                                                       \`licenseId\` char(36) NULL,
                                                       \`libraryId\` char(36) NULL,
                                                       \`defaultsId\` char(36) NULL,
                                                       UNIQUE INDEX \`REL_91a165c1091a6959cc19d52239\` (\`authorizationId\`),
                                                       UNIQUE INDEX \`REL_8339e62882f239dc00ff5866f8\` (\`licenseId\`),
                                                       UNIQUE INDEX \`REL_bea623a346d2e3f88dd0aeef57\` (\`libraryId\`),
                                                       UNIQUE INDEX \`REL_9542f2ad51464f961e5b5b5b58\` (\`defaultsId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`accountId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_6bdeffaf6ea6159b4672a2aed7\` (\`accountId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6bdeffaf6ea6159b4672a2aed7\` ON \`space\` (\`accountId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`accountId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD UNIQUE INDEX \`IDX_69e32f4f4652f654dc8641ae2b\` (\`accountId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_69e32f4f4652f654dc8641ae2b\` ON \`opportunity\` (\`accountId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`accountId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD UNIQUE INDEX \`IDX_78017461e03bd2a6cd47044bf6\` (\`accountId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_78017461e03bd2a6cd47044bf6\` ON \`challenge\` (\`accountId\`)`
    );
  }

  private async accountUpAfterData(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_91a165c1091a6959cc19d522399\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_8339e62882f239dc00ff5866f8c\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_bea623a346d2e3f88dd0aeef576\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_9542f2ad51464f961e5b5b5b582\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6bdeffaf6ea6159b4672a2aed70\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD CONSTRAINT \`FK_69e32f4f4652f654dc8641ae2b8\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_78017461e03bd2a6cd47044bf6a\` FOREIGN KEY (\`accountId\`) REFERENCES \`account\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_3ef80ef55ba1a1d45e625ea8389\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6b1efee39d076d9f7ecb8fef4cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_33336901817dd09d5906537e088\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ef077d5cc64cd388217db42ea9\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``
    );

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`licenseId\``);
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP COLUMN \`templatesSetId\``
    );
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`defaultsId\``);
  }

  private async accountDownBeforeData(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`templatesSetId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`licenseId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`defaultsId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_9542f2ad51464f961e5b5b5b582\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_bea623a346d2e3f88dd0aeef576\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_8339e62882f239dc00ff5866f8c\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_91a165c1091a6959cc19d522399\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_78017461e03bd2a6cd47044bf6a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP FOREIGN KEY \`FK_69e32f4f4652f654dc8641ae2b8\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6bdeffaf6ea6159b4672a2aed70\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_78017461e03bd2a6cd47044bf6\` ON \`challenge\``
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP INDEX \`IDX_78017461e03bd2a6cd47044bf6\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_69e32f4f4652f654dc8641ae2b\` ON \`opportunity\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP INDEX \`IDX_69e32f4f4652f654dc8641ae2b\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6bdeffaf6ea6159b4672a2aed7\` ON \`space\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_6bdeffaf6ea6159b4672a2aed7\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9542f2ad51464f961e5b5b5b58\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bea623a346d2e3f88dd0aeef57\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_8339e62882f239dc00ff5866f8\` ON \`account\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_91a165c1091a6959cc19d52239\` ON \`account\``
    );
  }

  private async accountDownAfterData(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_3ef80ef55ba1a1d45e625ea838\` ON \`space\` (\`licenseId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_ef077d5cc64cd388217db42ea9\` ON \`space\` (\`templatesSetId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_3ef80ef55ba1a1d45e625ea8389\` FOREIGN KEY (\`licenseId\`) REFERENCES \`license\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_33336901817dd09d5906537e088\` FOREIGN KEY (\`templatesSetId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6b1efee39d076d9f7ecb8fef4cd\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`accountId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`accountId\``
    );

    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`accountId\``);

    await queryRunner.query(`DROP TABLE \`account\``);
  }

  private async challengeHierarchyUp(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_494b27cb13b59128fb24b365ca6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`spaceId\` TO \`spaceID2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`parentSpaceId\` TO \`spaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_494b27cb13b59128fb24b365ca6\` FOREIGN KEY (\`spaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_7d2b222d54b900071b0959f03ef\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`parentChallengeId\``
    );
  }

  private async challengeHierarchyDown(
    queryRunner: QueryRunner
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP FOREIGN KEY \`FK_494b27cb13b59128fb24b365ca6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`spaceId\` TO \`parentSpaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` RENAME COLUMN \`spaceID2\` TO \`spaceId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_494b27cb13b59128fb24b365ca6\` FOREIGN KEY (\`parentSpaceId\`) REFERENCES \`space\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`parentChallengeId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD CONSTRAINT \`FK_7d2b222d54b900071b0959f03ef\` FOREIGN KEY (\`parentChallengeId\`) REFERENCES \`challenge\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  private async projectAgreementUp(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP FOREIGN KEY \`FK_8785b5a8510cabcc25d0f196783\``
    );
    await queryRunner.query(
      `ALTER TABLE \`agreement\` DROP FOREIGN KEY \`FK_22348b89c2f802a3d75d52fbd57\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_35e34564793a27bb3c209a15245\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_49991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_f425931bb61a95ef6f6d89c9a85\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP FOREIGN KEY \`FK_fac8673f44e6b295e30d1c1739a\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_22348b89c2f802a3d75d52fbd5\` ON \`agreement\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_fac8673f44e6b295e30d1c1739\` ON \`project\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` ON \`project\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP INDEX \`FK_35e34564793a27bb3c209a15245\``
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` DROP INDEX \`FK_49991450cf75dc486700ca034c6\``
    );

    await queryRunner.query(`DROP TABLE \`agreement\``);
    await queryRunner.query(`DROP TABLE \`project\``);
  }

  private async projectAgreementDown(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`agreement\` (
      \`id\` char(36) NOT NULL,
      \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
      \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
      \`version\` int(11) NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`description\` text DEFAULT NULL,
      \`projectId\` char(36) DEFAULT NULL,
      \`tagsetId\` char(36) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`REL_22348b89c2f802a3d75d52fbd5\` (\`tagsetId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`CREATE TABLE \`project\` (
      \`id\` char(36) NOT NULL,
      \`createdDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6),
      \`updatedDate\` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
      \`version\` int(11) NOT NULL,
      \`nameID\` varchar(36) NOT NULL,
      \`spaceID\` char(36) DEFAULT NULL,
      \`authorizationId\` char(36) DEFAULT NULL,
      \`lifecycleId\` char(36) DEFAULT NULL,
      \`opportunityId\` char(36) DEFAULT NULL,
      \`profileId\` char(36) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE INDEX \`REL_fac8673f44e6b295e30d1c1739\` (\`authorizationId\`),
      UNIQUE INDEX \`REL_f425931bb61a95ef6f6d89c9a8\` (\`lifecycleId\`),
      INDEX \`FK_35e34564793a27bb3c209a15245\` (\`opportunityId\`),
      INDEX \`FK_49991450cf75dc486700ca034c6\` (\`profileId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `agreement` ADD CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );

    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      `ALTER TABLE \`project\` ADD CONSTRAINT \`FK_49991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `project` ADD CONSTRAINT `FK_fac8673f44e6b295e30d1c1739a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  private async createAuthorization(queryRunner: QueryRunner): Promise<string> {
    // Create and link the Profile
    const authorizationID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${authorizationID}',
                1, '', '', 0, '')`
    );
    return authorizationID;
  }
}
