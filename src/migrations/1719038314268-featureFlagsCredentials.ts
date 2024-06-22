import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class featureFlagsCredentials1719038314268
  implements MigrationInterface
{
  name = 'featureFlagsCredentials1719038314268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new flags on license_plan
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`assignToNewOrganizationAccounts\` tinyint NOT NULL DEFAULT '0'`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`assignToNewUserAccounts\` tinyint NOT NULL DEFAULT '0'`
    );

    // Update existing plans to have new flags
    const existingPlans: {
      id: string;
      name: string;
    }[] = await queryRunner.query(`SELECT id, name FROM \`license_plan\``);
    for (const existingPlan of existingPlans) {
      let assignToNewOrganizationAccounts = false;
      let assignToNewUserAccounts = false;
      if (existingPlan.name === 'FREE') {
        assignToNewOrganizationAccounts = true;
        assignToNewUserAccounts = true;
      }
      await queryRunner.query(
        `UPDATE \`license_plan\`
          SET \`assignToNewOrganizationAccounts\` = ?,
              \`assignToNewUserAccounts\` = ?
          WHERE id = ?;
        `,
        [
          assignToNewOrganizationAccounts,
          assignToNewUserAccounts,
          existingPlan.id,
        ]
      );
    }

    // Create a new plan for each of the planDefinitions
    const [platform]: {
      id: string;
      licensingId: string;
    }[] = await queryRunner.query(`SELECT id, licensingId FROM platform`);

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
            \`assignToNewUserAccounts\`)
          VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
        ]
      );
    }

    const accounts: {
      id: string;
      agentId: string;
      licenseId: string;
    }[] = await queryRunner.query(
      `SELECT \`id\`, agentId, licenseId FROM \`account\``
    );
    for (const account of accounts) {
      const featureFlags: {
        id: string;
        name: string;
        enabled: string;
      }[] = await queryRunner.query(
        `SELECT id, name, enabled FROM feature_flag where licenseId = '${account.id}'`
      );
      for (const flag of featureFlags) {
        // Assign a credential to the agent under account if enabled
        if (flag.enabled) {
          const plan = plans.find(p => p.name === flag.name);
          if (plan) {
            const credentialID = randomUUID();
            let credentialType: string = '';
            switch (flag.name) {
              case LicenseCredential.WHITEBOARD_MULTI_USER:
                credentialType =
                  LicenseCredential.FEATURE_WHITEBOARD_MULTI_USER;
                break;
              case LicenseCredential.CALLOUT_TO_CALLOUT_TEMPLATE:
                credentialType =
                  LicenseCredential.FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE;
                break;
              case LicenseCredential.VIRTUAL_CONTRIBUTORS:
                credentialType = LicenseCredential.FEATURE_VIRTUAL_CONTRIBUTORS;
                break;
            }

            await queryRunner.query(
              `INSERT INTO \`credential\`
                ( \`id\`, \`version\`, \`agentId\`, \`type\`, \`resourceID\`)
                VALUES
                (?,  ?, ?, ?, ?);
              `,
              [
                `${credentialID}`,
                1, // version
                account.agentId,
                credentialType,
                account.id,
              ]
            );
          }
        }
      }
    }

    // Update the license policy to include the new credential rules
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` ADD \`credentialRulesStr\` text NOT NULL`
    );
    const [license_policy]: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM license_policy`);
    await queryRunner.query(
      `UPDATE license_policy SET credentialRulesStr = '${JSON.stringify(
        licenseCredentialRules
      )}' WHERE id = '${license_policy.id}'`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_policy\` DROP COLUMN \`featureFlagRules\` `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

export enum LicenseCredential {
  WHITEBOARD_MULTI_USER = 'whiteboard-multi-user',
  CALLOUT_TO_CALLOUT_TEMPLATE = 'callout-to-callout-template',
  VIRTUAL_CONTRIBUTORS = 'virtual-contributors',
}

export enum LicenseCredential {
  FEATURE_WHITEBOARD_MULTI_USER = 'feature-whiteboard-multi-user',
  FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE = 'feature-callout-to-callout-template',
  FEATURE_VIRTUAL_CONTRIBUTORS = 'feature-virtual-contributors',
}

const plans = [
  {
    name: 'FEATURE_WHITEBOARD_MULTI_USER',
    credential: LicenseCredential.FEATURE_WHITEBOARD_MULTI_USER,
    enabled: true,
    sortOrder: 50,
    pricePerMonth: 0,
    isFree: true,
    trialEnabled: false,
    requiresPaymentMethod: false,
    requiresContactSupport: true,
    assignToNewOrganizationAccounts: false,
    assignToNewUserAccounts: false,
  },
  {
    name: 'FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE',
    credential: LicenseCredential.FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE,
    enabled: true,
    sortOrder: 60,
    pricePerMonth: 0,
    isFree: true,
    trialEnabled: false,
    requiresPaymentMethod: false,
    requiresContactSupport: true,
    assignToNewOrganizationAccounts: true,
    assignToNewUserAccounts: true,
  },
  {
    name: 'FEATURE_VIRTUAL_CONTRIBUTORS',
    credential: LicenseCredential.FEATURE_VIRTUAL_CONTRIBUTORS,
    enabled: true,
    sortOrder: 70,
    pricePerMonth: 0,
    isFree: true,
    trialEnabled: false,
    requiresPaymentMethod: false,
    requiresContactSupport: true,
    assignToNewOrganizationAccounts: false,
    assignToNewUserAccounts: true,
  },
];

export type CredentialRule = {
  credentialType: LicenseCredential;
  grantedPrivileges: LicensePrivilege[];
  name: string;
};

export enum LicensePrivilege {
  VIRTUAL_CONTRIBUTOR_ACCESS = 'virtual-contributor-access',
  WHITEBOARD_MULTI_USER = 'whiteboard-multi-user',
  CALLOUT_SAVE_AS_TEMPLATE = 'callout-save-as-template',
}

export const licenseCredentialRules: CredentialRule[] = [
  {
    credentialType: LicenseCredential.VIRTUAL_CONTRIBUTORS,
    grantedPrivileges: [LicensePrivilege.VIRTUAL_CONTRIBUTOR_ACCESS],
    name: 'Virtual Contributors',
  },
  {
    credentialType: LicenseCredential.WHITEBOARD_MULTI_USER,
    grantedPrivileges: [LicensePrivilege.WHITEBOARD_MULTI_USER],
    name: 'Multi-user whiteboards',
  },
  {
    credentialType: LicenseCredential.CALLOUT_TO_CALLOUT_TEMPLATE,
    grantedPrivileges: [LicensePrivilege.CALLOUT_SAVE_AS_TEMPLATE],
    name: 'Callout templates',
  },
];
