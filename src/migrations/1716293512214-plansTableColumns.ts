import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class plansTableColumns1716293512214 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const { licensingId } = (
      await queryRunner.query(`
      SELECT \`licensingId\` FROM \`platform\`;
    `)
    )[0];

    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`sortOrder\` int NOT NULL DEFAULT (0)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`pricePerMonth\` DECIMAL(10,2) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`isFree\` TINYINT NOT NULL DEFAULT(0)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`trialEnabled\` TINYINT NOT NULL DEFAULT(0)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`requiresPaymentMethod\` TINYINT NOT NULL DEFAULT(0)`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`requiresContactSupport\` TINYINT NOT NULL DEFAULT(0)`
    );

    const plans = [
      {
        name: 'FREE',
        enabled: true,
        licensingId,
        sortOrder: 10,
        pricePerMonth: 0,
        isFree: true,
        trialEnabled: false,
        requiresPaymentMethod: false,
        requiresContactSupport: false,
      },
      {
        name: 'PLUS',
        enabled: true,
        licensingId,
        sortOrder: 20,
        pricePerMonth: 249,
        isFree: false,
        trialEnabled: true,
        requiresPaymentMethod: false,
        requiresContactSupport: false,
      },
      {
        name: 'PREMIUM',
        enabled: true,
        licensingId,
        sortOrder: 30,
        pricePerMonth: 749,
        isFree: false,
        trialEnabled: true,
        requiresPaymentMethod: false,
        requiresContactSupport: false,
      },
      {
        name: 'ENTERPRISE',
        enabled: true,
        licensingId,
        sortOrder: 40,
        pricePerMonth: null,
        isFree: false,
        trialEnabled: false,
        requiresPaymentMethod: false,
        requiresContactSupport: true,
      },
    ];

    for (const plan of plans) {
      await queryRunner.query(
        `INSERT INTO \`license_plan\`
        ( \`id\`, \`createdDate\`, \`updatedDate\`, \`version\`, \`name\`, \`enabled\`, \`licensingId\`, \`sortOrder\`, \`pricePerMonth\`, \`isFree\`, \`trialEnabled\`, \`requiresPaymentMethod\`, \`requiresContactSupport\`)
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          randomUUID(), // id
          new Date(), // createdDate
          new Date(), // updatedDate
          1, // version
          plan.name, // name
          plan.enabled, // enabled
          plan.licensingId, // licensingId
          plan.sortOrder, // sortOrder
          plan.pricePerMonth, // pricePerMonth
          plan.isFree, // isFree
          plan.trialEnabled, // trialEnabled
          plan.requiresPaymentMethod, // requiresPaymentMethod
          plan.requiresContactSupport, // requiresContactSupport
        ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP COLUMN \`sortOrder\`;`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP COLUMN \`pricePerMonth\`;`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP COLUMN \`isFree\`;`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP COLUMN \`trialEnabled\`;`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP COLUMN \`requiresPaymentMethod\`;`
    );
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` DROP COLUMN \`requiresContactSupport\`;`
    );
  }
}
