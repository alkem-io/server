import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeUserAccountHost1716810317354 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const credentialsToDelete: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT credential.id FROM alkemio.credential
      JOIN agent on credential.agentId = agent.id
      JOIN user on user.agentId = agent.id
      JOIN account on resourceID = account.id
      WHERE credential.type = 'account-host';`
    );

    if (credentialsToDelete.length === 0) {
      console.log('No credentials to delete');
      return;
    }
    await queryRunner.query(
      `DELETE FROM alkemio.credential WHERE id IN (${credentialsToDelete
        .map(c => `'${c.id}'`)
        .join(',')});`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration for removeUserAccountHost1716810317354');
  }
}
