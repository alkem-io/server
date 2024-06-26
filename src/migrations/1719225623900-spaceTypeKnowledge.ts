import { MigrationInterface, QueryRunner } from 'typeorm';

export class licensePlanType1719225622768 implements MigrationInterface {
  name = 'licensePlanType1719225622768';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`license_plan\` ADD \`type\` varchar(255) NULL`
    );

    const spaces: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM space`);

    for (const space of spaces) {
      if (space.type === 'vc') {
        await queryRunner.query(
          `UPDATE space SET type = 'knowledge' WHERE id = '${space.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
