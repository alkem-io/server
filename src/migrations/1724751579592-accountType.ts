import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountType1724751579592 implements MigrationInterface {
  name = 'AccountType1724751579592';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the type column to the storage aggregator table
    await queryRunner.query(
      'ALTER TABLE `account` ADD `type` varchar(128) NULL'
    );

    await this.updateAccountTypeForEntity(queryRunner, 'user', 'user');
    await this.updateAccountTypeForEntity(
      queryRunner,
      'organization',
      'organization'
    );

    // Update all license related credentials and plans
    for (const credentialUpdate of credentialUpdates) {
      await queryRunner.query(
        `UPDATE \`credential\` SET type = '${credentialUpdate.newCredentialName}' WHERE type = '${credentialUpdate.oldCredentialName}'`
      );
      await queryRunner.query(
        `UPDATE \`license_plan\` SET licenseCredential = '${credentialUpdate.newCredentialName}', name='${credentialUpdate.newPlanName}' WHERE licenseCredential = '${credentialUpdate.oldCredentialName}'`
      );
    }

    // Create new license plans for accounts
    const [platform]: {
      id: string;
      licensingId: string;
    }[] = await queryRunner.query(`SELECT id, licensingId FROM platform`);
    const licensingId = platform.licensingId;

    const [licensing]: {
      id: string;
      licensePolicyId: string;
    }[] = await queryRunner.query(
      `SELECT id, licensePolicyId FROM licensing WHERE id = '${licensingId}'`
    );

    for (const plan of plans) {
      const planID = randomUUID();
      await queryRunner.query(
        `INSERT INTO \`license_plan\`
          ( \`id\`,
            \`version\`,
            \`name\`,
            \`enabled\`,
            \`licensingId\`,
            \`sortOrder\`,
            \`pricePerMonth\`,
            \`isFree\`,
            \`trialEnabled\`,
            \`requiresPaymentMethod\`,
            \`requiresContactSupport\`,
            \`licenseCredential\`,
            \`assignToNewOrganizationAccounts\`,
            \`assignToNewUserAccounts\`,
            \`type\`)
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          planID, // id
          1, // version
          plan.name, // name
          plan.enabled, // enabled
          platform.licensingId, // licensingId
          plan.sortOrder, // sortOrder
          plan.pricePerMonth, // pricePerMonth
          plan.isFree, // isFree
          plan.trialEnabled, // trialEnabled
          plan.requiresPaymentMethod, // requiresPaymentMethod
          plan.requiresContactSupport, // requiresContactSupport
          plan.credential,
          plan.assignToNewOrganizationAccounts,
          plan.assignToNewUserAccounts,
          plan.type,
        ]
      );
    }

    // Update the credential rules in the license policy
    await queryRunner.query(
      `UPDATE \`license_policy\` SET credentialRulesStr = '${JSON.stringify(licenseCredentialRules)}' WHERE id = '${licensing.licensePolicyId}'`
    );

    // Update all accounts associated with users that are a) beta testers or b) part of the VC campaign and assign the appropriate license plan
    await this.assignUserBetaTestersAccountLicense(queryRunner);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async updateAccountTypeForEntity(
    queryRunner: QueryRunner,
    entityType: string,
    accountType: string
  ) {
    const entities: {
      id: string;
      accountID: string;
    }[] = await queryRunner.query(
      `SELECT id, accountID FROM \`${entityType}\``
    );
    for (const entity of entities) {
      const [account]: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM account WHERE id = '${entity.accountID}'`
      );
      if (account) {
        await queryRunner.query(
          `UPDATE \`account\` SET type = '${accountType}' WHERE id = '${account.id}'`
        );
      } else {
        console.log(`No account found for ${entityType}: ${entity.id}`);
      }
    }
  }

  private async assignUserBetaTestersAccountLicense(queryRunner: QueryRunner) {
    const users: {
      id: string;
      agentId: string;
      accountID: string;
    }[] = await queryRunner.query(
      `SELECT id, agentId, accountID FROM \`user\``
    );
    for (const user of users) {
      const credentials: {
        id: string;
        type: string;
      }[] = await queryRunner.query(
        `SELECT id, type FROM \`credential\` where agentId = '${user.agentId}'`
      );
      const matchingCredential = credentials.find(
        credential =>
          credential.type === 'beta-tester' || credential.type === 'vc-campaign'
      );
      if (matchingCredential) {
        const [account]: {
          id: string;
          agentId: string;
        }[] = await queryRunner.query(
          `SELECT id, agentId FROM account WHERE id = '${user.accountID}'`
        );
        if (account) {
          /// Create a new credential for the agent
          const credentialID = randomUUID();
          await queryRunner.query(
            `INSERT INTO \`credential\`
              ( \`id\`,
                \`version\`,
                \`type\`,
                \`resourceID\`,
                \`agentId\`)
              VALUES
              (?, ?, ?, ?, ?);
            `,
            [
              credentialID, // id
              1, // version
              'account-license-plus', // type
              account.id, // resource
              account.agentId, // agentId
            ]
          );
        } else {
          console.log(`No account found for user: ${user.id}`);
        }
      }
    }
  }
}

const credentialUpdates: CredentialUpdate[] = [
  {
    oldCredentialName: 'license-space-free',
    newCredentialName: 'space-license-free',
    newPlanName: 'SPACE_LICENSE_FREE',
  },
  {
    oldCredentialName: 'license-space-plus',
    newCredentialName: 'space-license-plus',
    newPlanName: 'SPACE_LICENSE_PLUS',
  },
  {
    oldCredentialName: 'license-space-enterprise',
    newCredentialName: 'space-license-enterprise',
    newPlanName: 'SPACE_LICENSE_ENTERPRISE',
  },
  {
    oldCredentialName: 'license-space-premium',
    newCredentialName: 'space-license-premium',
    newPlanName: 'SPACE_LICENSE_PREMIUM',
  },
  {
    oldCredentialName: 'feature-callout-to-callout-template',
    newCredentialName: 'space-feature-create-template',
    newPlanName: 'SPACE_FEATURE_CREATE_TEMPLATE',
  },
  {
    oldCredentialName: 'feature-whiteboard-multi-user',
    newCredentialName: 'space-feature-whiteboard-multi-user',
    newPlanName: 'SPACE_FEATURE_WHITEBOARD_MULTI_USER',
  },
  {
    oldCredentialName: 'feature-virtual-contributors',
    newCredentialName: 'space-feature-virtual-contributors',
    newPlanName: 'SPACE_FEATURE_VIRTUAL_CONTIBUTORS',
  },
];

export enum LicenseCredential {
  ACCOUNT_LICENSE_PLUS = 'account-license-plus',
}

const plans = [
  {
    name: 'ACCOUNT_LICENSE_PLUS',
    credential: LicenseCredential.ACCOUNT_LICENSE_PLUS,
    enabled: true,
    sortOrder: 50,
    pricePerMonth: 0,
    isFree: false,
    trialEnabled: false,
    requiresPaymentMethod: false,
    requiresContactSupport: true,
    assignToNewOrganizationAccounts: false,
    assignToNewUserAccounts: false,
    type: 'account-plan',
  },
];

export type CredentialUpdate = {
  oldCredentialName: string;
  newCredentialName: string;
  newPlanName: string;
};

const licenseCredentialRules = [
  {
    credentialType: 'space-feature-virtual-contributors',
    grantedPrivileges: ['space-virtual-contributor-access'],
    name: 'Space Virtual Contributors',
  },
  {
    credentialType: 'space-feature-whiteboard-multi-user',
    grantedPrivileges: ['space-whiteboard-multi-user'],
    name: 'Space Multi-user whiteboards',
  },
  {
    credentialType: 'space-feature-save-as-template',
    grantedPrivileges: ['space-save-as-template'],
    name: 'Space Save As Templatet',
  },
  {
    credentialType: 'space-license-plus',
    grantedPrivileges: [
      'space-whiteboard-multi-user',
      'space-save-as-template',
    ],
    name: 'Space License Plus',
  },
  {
    credentialType: 'space-license-premium',
    grantedPrivileges: [
      'space-whiteboard-multi-user',
      'space-save-as-template',
    ],
    name: 'Space License Premium',
  },
  {
    credentialType: 'account-license-plus',
    grantedPrivileges: [
      'account-create-space',
      'account-create-virtual-contributor',
      'account-create-innovation-pack',
    ],
    name: 'Account License Plus',
  },
];
