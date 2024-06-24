import { MigrationInterface, QueryRunner } from 'typeorm';

export class licensePlanType1719225622768 implements MigrationInterface {
  name = 'licensePlanType1719225622768';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`type\` varchar(255) NULL`
    );

    const licensePlans: {
      id: string;
      name: string;
    }[] = await queryRunner.query(`SELECT id, name FROM license_plan`);
    for (const licensePlan of licensePlans) {
      let type = LicensePlanType.SPACE_PLAN;
      if (licensePlan.name.toLowerCase().includes('feature')) {
        type = LicensePlanType.SPACE_FEATURE_FLAG;
      }
      await queryRunner.query(
        `UPDATE license_plan SET type = '${type}' WHERE id = '${licensePlan.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

export enum LicensePlanType {
  SPACE_PLAN = 'space-plan',
  SPACE_FEATURE_FLAG = 'space-feature-flag',
}
