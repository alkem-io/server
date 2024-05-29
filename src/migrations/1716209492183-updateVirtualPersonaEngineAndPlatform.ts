import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateVirtualPersonaEngineAndPlatform1716209492183
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE virtual_persona SET engine = 'expert', platformId = (SELECT id FROM platform LIMIT 0, 1)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
