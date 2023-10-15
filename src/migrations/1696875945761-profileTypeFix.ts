import { MigrationInterface, QueryRunner } from 'typeorm';

export class profileTypeFix1696875945761 implements MigrationInterface {
  name = 'profileTypeFix1696875945761';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE innovation_flow_template JOIN profile SET profile.type = 'innovation-flow-template' WHERE profile.id = innovation_flow_template.profileId"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(`not implemented - ${queryRunner} `);
  }
}
