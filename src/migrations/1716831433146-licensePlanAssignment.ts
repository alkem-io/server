import { Credential } from '@domain/agent';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class licensePlanAssignment1716831433146 implements MigrationInterface {
  name = 'licensePlanAssignment1716831433146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`licenseCredential\` varchar(255) NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`licensing\` ADD \`basePlanId\` char(36) NULL`
    );
    const plans: {
      id: string;
      name: string;
    }[] = await queryRunner.query(`SELECT id, name FROM license_plan`);
    for (const plan of plans) {
      const planDefinition = planDefinitions.find(p => p.name === plan.name);
      if (!planDefinition) {
        throw new Error(`Plan ${plan.name} not found`);
      }
      await queryRunner.query(
        `UPDATE license_plan SET licenseCredential = '${planDefinition.credential}' WHERE id = '${plan.id}'`
      );
    }
    const basePlan = plans.find(p => p.name === 'FREE');
    if (!basePlan) {
      throw new Error(`Base plan not found`);
    }
    await queryRunner.query(
      `UPDATE licensing SET basePlanId = '${basePlan.id}'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

export enum LicenseCredential {
  SPACE_FREE = 'license-space-free',
  SPACE_PLUS = 'license-space-plus',
  SPACE_PREMIUM = 'license-space-premium',
  SPACE_ENTERPRISE = 'license-space-enterprise',
}

export const planDefinitions = [
  {
    name: 'FREE',
    credential: LicenseCredential.SPACE_FREE,
  },
  {
    name: 'PLUS',
    credential: LicenseCredential.SPACE_PLUS,
  },
  {
    name: 'PREMIUM',
    credential: LicenseCredential.SPACE_PREMIUM,
  },
  {
    name: 'ENTERPRISE',
    credential: LicenseCredential.SPACE_ENTERPRISE,
  },
];
