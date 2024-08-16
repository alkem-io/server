import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRelation1723391280682 implements MigrationInterface {
  name = 'RemoveRelation1723391280682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const relations: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`relation\``
    );
    for (const relation of relations) {
      await queryRunner.query(
        `DELETE FROM \`authorization_policy\` WHERE id = '${relation.authorizationId}'`
      );

      await queryRunner.query(
        `DELETE FROM \`relation\` WHERE id = '${relation.id}'`
      );
    }
    // delete the relation table
    await queryRunner.query(`DROP TABLE \`relation\``);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {}
}
