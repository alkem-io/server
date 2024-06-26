import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class generateFeatureFlagCredentials1719410254726
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
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
        enabled: boolean;
      }[] = await queryRunner.query(
        `SELECT id, name, enabled FROM feature_flag where licenseId = '${account.licenseId}'`
      );
      for (const flag of featureFlags) {
        // Assign a credential to the agent under account if enabled
        if (flag.enabled) {
          const plan = plans.find(p => p.name === flag.name);
          if (plan) {
            const credentialID = randomUUID();
            let credentialType: string = '';
            switch ('feature-' + flag.name) {
              case LicenseCredential.FEATURE_WHITEBOARD_MULTI_USER:
                credentialType =
                  LicenseCredential.FEATURE_WHITEBOARD_MULTI_USER;
                break;
              case LicenseCredential.FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE:
                credentialType =
                  LicenseCredential.FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE;
                break;
              case LicenseCredential.FEATURE_VIRTUAL_CONTRIBUTORS:
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

enum LicenseCredential {
  FEATURE_WHITEBOARD_MULTI_USER = 'feature-whiteboard-multi-user',
  FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE = 'feature-callout-to-callout-template',
  FEATURE_VIRTUAL_CONTRIBUTORS = 'feature-virtual-contributors',
}

const plans = [
  {
    name: 'whiteboard-multi-user',
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
    name: 'callout-to-callout-template',
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
    name: 'virtual-contributors',
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
