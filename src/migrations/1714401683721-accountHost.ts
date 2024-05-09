import { MigrationInterface, QueryRunner } from 'typeorm';

export class accountHost1714401683721 implements MigrationInterface {
  name = 'accountHost1714401683721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const accountHostCredentials: {
      id: string;
      resourceID: string;
      type: string;
    }[] = await queryRunner.query(
      `SELECT id, resourceID, type FROM credential where type = 'account-host'`
    );
    for (const accountHostCredential of accountHostCredentials) {
      // try to look up the account
      const [account]: any[] = await queryRunner.query(
        `SELECT id FROM account WHERE id = '${accountHostCredential.resourceID}'`
      );
      if (account) break; // all ok

      // Move from spaceID to accountID
      const [space]: {
        id: string;
        accountId: string;
      }[] = await queryRunner.query(
        `SELECT id, accountId FROM space WHERE id = '${accountHostCredential.resourceID}'`
      );
      if (space) {
        await queryRunner.query(
          `UPDATE credential SET resourceID = '${space.accountId}' WHERE id = '${accountHostCredential.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
