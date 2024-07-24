import { MigrationInterface, QueryRunner } from 'typeorm';

export class LevelZeroSpaceID1721803817721 implements MigrationInterface {
  name = 'LevelZeroSpaceID1721803817721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `space` ADD `levelZeroSpaceID` char(36) NULL'
    );
    const spaces: {
      id: string;
      accountId: string;
      level: number;
    }[] = await queryRunner.query(`SELECT id, accountId, level FROM \`space\``);
    for (const space of spaces) {
      const [account]: {
        id: string;
        spaceId: string;
      }[] = await queryRunner.query(
        `SELECT id, spaceId FROM account WHERE id = '${space.accountId}'`
      );
      if (account) {
        await queryRunner.query(
          `UPDATE space SET levelZeroSpaceID = '${account.spaceId}' WHERE id = '${space.id}'`
        );
      } else {
        console.log(`No root space found for account ${space.id}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
