import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexActorProfileId1771000021000 implements MigrationInterface {
  name = 'AddIndexActorProfileId1771000021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_actor_profileId" ON "actor" ("profileId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_actor_profileId"`);
  }
}
