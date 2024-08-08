import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteAccountsWithoutSpaces1723121607785
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const credentialsToDelete: {
      id: string;
    }[] = await queryRunner.query(
      `SELECT credential.id FROM alkemio.credential
      JOIN agent on credential.agentId = agent.id
      JOIN account on account.agentId = agent.id
      WHERE account.spaceId IS NULL;`
    );

    if (credentialsToDelete.length === 0) {
      console.log('No credentials to delete');
      return;
    }
    await queryRunner.query(
      `DELETE FROM credential WHERE id IN (${credentialsToDelete
        .map(c => `'${c.id}'`)
        .join(',')});`
    );
    await queryRunner.query(`DELETE FROM account WHERE spaceId IS NULL;`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      'No down migration for deleteAccountsWithoutSpaces1723121607785'
    );
  }
}
