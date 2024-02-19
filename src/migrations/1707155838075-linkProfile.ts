import { MigrationInterface, QueryRunner } from 'typeorm';

export class linkProfile1707155838075 implements MigrationInterface {
  name = 'linkProfile1707155838075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const contributions: {
      id: string;
      linkId: string;
    }[] = await queryRunner.query(
      `SELECT id, linkId FROM callout_contribution`
    );
    for (const contribution of contributions) {
      if (contribution.linkId) {
        await queryRunner.query(
          `UPDATE \`reference\` SET profileId = NULL WHERE (id = '${contribution.linkId}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
