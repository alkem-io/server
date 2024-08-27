import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { query } from 'express';

export class AccountsUserOrg1723391282999 implements MigrationInterface {
  name = 'AccountsUserOrg1723391282999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`space\` SET accountId = null WHERE level = '1'`
    );
    await queryRunner.query(
      `UPDATE \`space\` SET accountId = null WHERE level = '2'`
    );
    await this.accountsMigrationContributor(queryRunner, 'user');
    await this.accountsMigrationContributor(queryRunner, 'organization');

    // remove spaceId from account
    await queryRunner.query('ALTER TABLE `account` DROP COLUMN `spaceId`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async moveAccountResources(
    queryRunner: QueryRunner,
    tableName: string,
    masterAccountID: string,
    slaveAccountID: string
  ): Promise<void> {
    const accountResources: {
      id: string;
      accountId: string;
    }[] = await queryRunner.query(
      `SELECT id, accountId FROM \`${tableName}\` WHERE accountId = '${slaveAccountID}'`
    );
    for (const accountResource of accountResources) {
      await queryRunner.query(
        `UPDATE \`${tableName}\` SET accountId = '${masterAccountID}' WHERE id = '${accountResource.id}'`
      );
    }
  }

  private async accountsMigrationContributor(
    queryRunner: QueryRunner,
    contributorType: string
  ) {
    // Clean up bad data:
    const wrongCredentials: {
      id: string;
      resourceID: string;
      agentId: string;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, resourceID, type, agentId FROM credential WHERE type = 'account-host' AND resourceID NOT IN (SELECT id FROM account)`
    );
    if (wrongCredentials.length > 0) {
      console.log(
        'BAD DATA: Credentials found with invalid account-host resourceID. Deleting...',
        wrongCredentials
      );
      await queryRunner.query(
        `DELETE FROM credential WHERE id IN (${wrongCredentials.map(credential => `'${credential.id}'`).join(',')})`
      );
    }

    const contributors: {
      id: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, agentId FROM \`${contributorType}\``
    );
    for (const contributor of contributors) {
      // select all ACCOUNT_HOST credentials associated with the user
      let accountHostCredentials: {
        id: string;
        resourceID: string;
        type: string;
      }[] = await queryRunner.query(
        `SELECT id, resourceID, type FROM \`credential\` WHERE agentId = '${contributor.agentId}' AND type = 'account-host'`
      );
      if (accountHostCredentials.length === 0) {
        // create a new and associated credential for the contributor
        const accountID = await this.createAccount(queryRunner);
        await this.assignAccountHostCredential(
          queryRunner,
          contributor.agentId,
          accountID
        );
      } else if (accountHostCredentials.length === 1) {
        // Move the account licensing credentials to the space agent
        await this.moveAccountCredentialsToSpace(
          queryRunner,
          accountHostCredentials[0].resourceID
        );
      } else if (accountHostCredentials.length > 1) {
        // Pick the first one, and merge them all into it
        const masterAccountID = accountHostCredentials[0].resourceID;
        await this.moveAccountCredentialsToSpace(
          queryRunner,
          accountHostCredentials[0].resourceID
        );
        for (let i = 1; i < accountHostCredentials.length; i++) {
          const slaveAccountID = accountHostCredentials[i].resourceID;
          await this.moveAccountCredentialsToSpace(queryRunner, slaveAccountID);

          await this.moveAccountResources(
            queryRunner,
            'virtual_contributor',
            masterAccountID,
            slaveAccountID
          );
          await this.moveAccountResources(
            queryRunner,
            'innovation_hub',
            masterAccountID,
            slaveAccountID
          );
          await this.moveAccountResources(
            queryRunner,
            'innovation_pack',
            masterAccountID,
            slaveAccountID
          );
          await this.moveAccountResources(
            queryRunner,
            'space',
            masterAccountID,
            slaveAccountID
          );
          // Delete the old accounts + associated credential
          await this.deleteAccount(queryRunner, slaveAccountID);
          await queryRunner.query(
            `DELETE FROM credential WHERE resourceId = '${slaveAccountID}' AND type = 'account-host'`
          );
        }
      }
    }
  }

  private async moveAccountCredentialsToSpace(
    queryRunner: QueryRunner,
    accountID: string
  ) {
    const [account]: {
      id: string;
      spaceId: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, spaceId, agentId FROM account WHERE id = '${accountID}'`
    );
    if (!account) {
      console.log(`ACCOUNT for credential does not exist? ${accountID}`);
      return;
    }
    const spaceID = account.spaceId;
    const [space]: {
      id: string;
      agentId: string;
    }[] = await queryRunner.query(
      `SELECT id, agentId FROM space WHERE id = '${spaceID}'`
    );
    if (!space) {
      console.log(`Space for account? ${accountID}`);
      return;
    }
    const accountAgentID = account.agentId;
    const spaceAgentID = space.agentId;
    // Move all credentials from account agent to space agent
    await queryRunner.query(
      `UPDATE credential SET agentId = '${spaceAgentID}', resourceId = '${spaceID}' WHERE agentId = '${accountAgentID}' AND resourceId = '${accountID}'`
    );
  }

  private async deleteAccount(
    queryRunner: QueryRunner,
    accountID: string
  ): Promise<void> {
    const [account]: {
      id: string;
      authorizationId: string;
      agentId: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId, agentId, storageAggregatorId FROM account WHERE id = '${accountID}'`
    );
    if (!account) {
      console.log(`ACCOUNT WAS ALREADY DELETED? ${accountID}`);
      return;
    }
    await queryRunner.query(
      `DELETE FROM authorization_policy WHERE id = '${account.authorizationId}'`
    );
    await queryRunner.query(
      `DELETE FROM credential WHERE agentId = '${account.agentId}'`
    );
    await queryRunner.query(
      `DELETE FROM agent WHERE id = '${account.agentId}'`
    );
    await queryRunner.query(
      `DELETE FROM storage_aggregator WHERE id = '${account.storageAggregatorId}'`
    );
    await queryRunner.query(`DELETE FROM account WHERE id = '${accountID}'`);
  }

  private async assignAccountHostCredential(
    queryRunner: QueryRunner,
    agentID: string,
    accountID: string
  ): Promise<void> {
    const credentialID = randomUUID();
    await queryRunner.query(
      `INSERT INTO credential (id, version, agentId, type, resourceID)
                VALUES ('${credentialID}',
                        '1',
                        '${agentID}',
                        'account-host',
                        '${accountID}')`
    );
  }

  private async createAccount(queryRunner: QueryRunner): Promise<string> {
    const accountID = randomUUID();
    const accountAuthID = randomUUID();

    const agentID = await this.createAgentForAccount(queryRunner);
    const storageAggregatorID = await this.createStorageAggregator(queryRunner);

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
          ('${accountAuthID}',
          1, '', '', 0, '', 'account')`
    );

    await queryRunner.query(
      `INSERT INTO account (id, version, authorizationId, agentId, storageAggregatorId)
                VALUES ('${accountID}',
                        '1',
                        '${accountAuthID}',
                        '${agentID}',
                        '${storageAggregatorID}')`
    );

    return accountID;
  }

  private async createAgentForAccount(
    queryRunner: QueryRunner
  ): Promise<string> {
    const agentID = randomUUID();
    const agentAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
          ('${agentAuthID}',
          1, '', '', 0, '', 'agent')`
    );

    await queryRunner.query(
      `INSERT INTO agent (id, version, authorizationId, did, password, type)
                VALUES ('${agentID}',
                        '1',
                        '${agentAuthID}',
                        '',
                        '',
                        'account')`
    );
    return agentID;
  }

  private async createStorageAggregator(
    queryRunner: QueryRunner
  ): Promise<string> {
    const storageAggregatorID = randomUUID();
    const storageAggregatorAuthID = randomUUID();

    const directStorageId = await this.createStorageBucket(queryRunner);

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
          ('${storageAggregatorAuthID}',
          1, '', '', 0, '', 'storage-aggregator')`
    );

    await queryRunner.query(
      `INSERT INTO storage_aggregator (id, version, authorizationId, directStorageId)
                VALUES ('${storageAggregatorID}',
                        '1',
                        '${storageAggregatorAuthID}',
                        '${directStorageId}')`
    );

    return storageAggregatorID;
  }

  private async createStorageBucket(queryRunner: QueryRunner): Promise<string> {
    const storageBucketID = randomUUID();
    const storageBucketAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules, type) VALUES
          ('${storageBucketAuthID}',
          1, '', '', 0, '', 'storage-bucket')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, authorizationId, allowedMimeTypes, maxFileSize, storageAggregatorId)
              VALUES ('${storageBucketID}',
                      '1',
                      '${storageBucketAuthID}',
                      '${allowedTypes}',
                      ${maxAllowedFileSize},
                      null)`
    );

    return storageBucketID;
  }

  private async assignLicensePlansToAgent(
    queryRunner: QueryRunner,
    agentID: string
  ): Promise<void> {
    for (const licensePlanType of licensePlanTypes) {
      const credentialID = randomUUID();
      await queryRunner.query(
        `INSERT INTO credential (id, version, agentId, type, resourceID)
                VALUES ('${credentialID}',
                        '1',
                        '${agentID}',
                        '${licensePlanType}',
                        '')`
      );
    }
  }
}

export const licensePlanTypes = [
  'feature-virtual-contributors',
  'feature-callout-to-callout-template',
  'license-space-free',
];

export const allowedTypes = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'image/bmp',
  'image/jpg',
  'image/jpeg',
  'image/x-png',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

export const maxAllowedFileSize = 15728640;

export enum LicenseCredential {
  LICENSE_SPACE_FREE = 'license-space-free',
  LICENSE_SPACE_PLUS = 'license-space-plus',
  LICENSE_SPACE_PREMIUM = 'license-space-premium',
  LICENSE_SPACE_ENTERPRISE = 'license-space-enterprise',
  FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE = 'feature-callout-to-callout-template',
  FEATURE_VIRTUAL_CONTRIBUTORS = 'feature-virtual-contributors',
  FEATURE_WHITEBOARD_MULTI_USER = 'feature-whiteboard-multi-user',
}
