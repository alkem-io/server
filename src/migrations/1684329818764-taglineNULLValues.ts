import { MigrationInterface, QueryRunner } from 'typeorm';

export class taglineNULLValues1684329818764 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE profile SET tagline = '' WHERE (tagline IS NULL)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
