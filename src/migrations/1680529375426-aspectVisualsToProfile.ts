import { MigrationInterface, QueryRunner } from 'typeorm';

export class aspectVisualsToProfile1680529375426 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const aspects: {
      bannerId: string;
      bannerNarrowId: string;
      profileId: string;
    }[] = await queryRunner.query(
      'SELECT bannerId, bannerNarrowId, profileId FROM aspect WHERE bannerId is NOT NULL or bannerNarrowId is NOT NULL'
    );

    for (const aspect of aspects) {
      await queryRunner.query(`
        UPDATE visual SET profileId = '${aspect.profileId}'
        WHERE id in ('${aspect.bannerId}', '${aspect.bannerNarrowId}')
      `);
    }

    await queryRunner.query(
      'ALTER TABLE aspect DROP FOREIGN KEY FK_7e83c97dc253674f4ce9d32cb01'
    );
    await queryRunner.query(
      'DROP INDEX REL_7e83c97dc253674f4ce9d32cb0 ON aspect'
    );
    await queryRunner.query(
      'ALTER TABLE aspect DROP INDEX IDX_7e83c97dc253674f4ce9d32cb0'
    );
    await queryRunner.query('ALTER TABLE aspect DROP COLUMN bannerNarrowId');

    await queryRunner.query(
      'ALTER TABLE aspect DROP FOREIGN KEY FK_945b0355b4e9bd6b02c66507a30'
    );
    await queryRunner.query(
      'DROP INDEX REL_945b0355b4e9bd6b02c66507a3 ON aspect'
    );
    await queryRunner.query(
      'ALTER TABLE aspect DROP INDEX IDX_945b0355b4e9bd6b02c66507a3'
    );
    await queryRunner.query('ALTER TABLE aspect DROP COLUMN bannerId');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
