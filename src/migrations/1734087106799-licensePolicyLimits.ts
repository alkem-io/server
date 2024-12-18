import { MigrationInterface, QueryRunner } from 'typeorm';

export class LicensePolicyLimits1734087106799 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [licensePolicy]: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM license_policy`);
    await queryRunner.query(
      `UPDATE license_policy SET credentialRulesStr = ? WHERE id = ?`,
      [`${JSON.stringify(licenseCredentialRules)}`, licensePolicy.id]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration needed');
  }
}

type CredentialRule = {
  credentialType: LicenseCredential;
  grantedEntitlements: GrantedEntitlement[];
  name: string;
};

type GrantedEntitlement = {
  type: LicenseEntitlementType;
  limit: number;
};

enum LicenseCredential {
  SPACE_LICENSE_FREE = 'space-license-free',
  SPACE_LICENSE_PLUS = 'space-license-plus',
  SPACE_LICENSE_PREMIUM = 'space-license-premium',
  SPACE_LICENSE_ENTERPRISE = 'space-license-enterprise', // todo: remove for space
  SPACE_FEATURE_SAVE_AS_TEMPLATE = 'space-feature-save-as-template',
  SPACE_FEATURE_VIRTUAL_CONTRIBUTORS = 'space-feature-virtual-contributors',
  SPACE_FEATURE_WHITEBOARD_MULTI_USER = 'space-feature-whiteboard-multi-user',
  ACCOUNT_LICENSE_PLUS = 'account-license-plus',
}

enum LicenseEntitlementType {
  ACCOUNT_SPACE_FREE = 'account-space-free',
  ACCOUNT_SPACE_PLUS = 'account-space-plus',
  ACCOUNT_SPACE_PREMIUM = 'account-space-premium',
  ACCOUNT_VIRTUAL_CONTRIBUTOR = 'account-virtual-contributor',
  ACCOUNT_INNOVATION_PACK = 'account-innovation-pack',
  ACCOUNT_INNOVATION_HUB = 'account-innovation-hub',
  SPACE_FREE = 'space-free',
  SPACE_PLUS = 'space-plus',
  SPACE_PREMIUM = 'space-premium',
  SPACE_FLAG_SAVE_AS_TEMPLATE = 'space-flag-save-as-template',
  SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS = 'space-flag-virtual-contributor-access',
  SPACE_FLAG_WHITEBOARD_MULTI_USER = 'space-flag-whiteboard-multi-user',
}

const licenseCredentialRules: CredentialRule[] = [
  {
    credentialType: LicenseCredential.SPACE_FEATURE_VIRTUAL_CONTRIBUTORS,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
        limit: 1,
      },
    ],
    name: 'Space Virtual Contributors',
  },
  {
    credentialType: LicenseCredential.SPACE_FEATURE_WHITEBOARD_MULTI_USER,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        limit: 1,
      },
    ],
    name: 'Space Multi-user whiteboards',
  },
  {
    credentialType: LicenseCredential.SPACE_FEATURE_SAVE_AS_TEMPLATE,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
        limit: 1,
      },
    ],
    name: 'Space Save As Templatet',
  },
  {
    credentialType: LicenseCredential.SPACE_LICENSE_FREE,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_FREE,
        limit: 1,
      },
    ],
    name: 'Space License Free',
  },
  {
    credentialType: LicenseCredential.SPACE_LICENSE_PLUS,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_PLUS,
        limit: 1,
      },
      {
        type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        limit: 1,
      },
      {
        type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
        limit: 1,
      },
    ],
    name: 'Space License Plus',
  },
  {
    credentialType: LicenseCredential.SPACE_LICENSE_PREMIUM,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.SPACE_PREMIUM,
        limit: 1,
      },
      {
        type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
        limit: 1,
      },
      {
        type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
        limit: 1,
      },
    ],
    name: 'Space License Premium',
  },
  {
    credentialType: LicenseCredential.ACCOUNT_LICENSE_PLUS,
    grantedEntitlements: [
      {
        type: LicenseEntitlementType.ACCOUNT_SPACE_FREE,
        limit: 3,
      },
      {
        type: LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR,
        limit: 3,
      },
      {
        type: LicenseEntitlementType.ACCOUNT_INNOVATION_HUB,
        limit: 1,
      },
      {
        type: LicenseEntitlementType.ACCOUNT_INNOVATION_PACK,
        limit: 3,
      },
    ],
    name: 'Account License Plus',
  },
];
