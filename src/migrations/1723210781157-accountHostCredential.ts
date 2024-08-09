import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountHostCredential1723210781157 implements MigrationInterface {
  name = 'AccountHostCredential1723210781157';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(
    //   `ALTER TABLE \`user\` ADD \`accountID\` char(36) NULL`
    // );
    // await queryRunner.query(
    //   `ALTER TABLE \`organization\` ADD \`accountID\` char(36) NULL`
    // );

    await this.updateContributorAccount(queryRunner, 'user');
    await this.updateContributorAccount(queryRunner, 'organization');
  }
  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async updateContributorAccount(
    queryRunner: QueryRunner,
    tableName: string
  ): Promise<void> {
    const contributors: {
      id: string;
      agentId: string;
    }[] = await queryRunner.query(`SELECT id, agentId FROM \`${tableName}\``);
    for (const contributor of contributors) {
      // select all ACCOUNT_HOST credentials associated with the user
      const accountHostCredentials: {
        id: string;
        resourceID: string;
      }[] = await queryRunner.query(
        `SELECT id, resourceID FROM credential WHERE resourceID = '${contributor.agentId}' AND type = 'account-host'`
      );
      if (accountHostCredentials.length !== 1) {
        throw new Error(
          `contributor found of type ${tableName} with id ${contributor.id} has ${accountHostCredentials.length} account-host credentials`
        );
      }
      const hostCredential = accountHostCredentials[0];
      await queryRunner.query(
        `UPDATE \`${tableName}\` SET accountID = '${hostCredential.resourceID}' WHERE id = '${contributor.id}'`
      );
      // delete the credential
      await queryRunner.query(
        `DELETE FROM credential WHERE id = '${hostCredential.id}'`
      );
    }
  }
}
