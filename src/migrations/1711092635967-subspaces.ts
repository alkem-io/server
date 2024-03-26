import { MigrationInterface, QueryRunner } from 'typeorm';

export class subspaces1711092635967 implements MigrationInterface {
  name = 'subspaces1711092635967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`account\` RENAME COLUMN \`spaceID\` TO \`spaceId2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD \`spaceId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`level\` int NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`level\` int NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE \`space\` ADD \`level\` int NOT NULL`);

    // User group had some legacy fields that are no longer needed
    await queryRunner.query(
      `ALTER TABLE \`user_group\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(`ALTER TABLE \`user_group\` DROP COLUMN \`name\``); // TODO: check user group data on production. This might need to be a migration script as well as a schema change

    // User group had some legacy fields that are no longer needed
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`spaceID\``
    );

    const accounts: {
      id: string;
      spaceId2: string;
    }[] = await queryRunner.query(`SELECT id, spaceId2 FROM account`);
    for (const account of accounts) {
      await queryRunner.query(
        `UPDATE account SET spaceId = '${account.spaceId2}' WHERE id = '${account.id}'`
      );
    }

    // Update the type for all credentials
    const credentials: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM credential`);
    for (const credential of credentials) {
      await queryRunner.query(
        `UPDATE credential SET type = '${this.updateCredentialType(
          credential.type
        )}' WHERE id = '${credential.id}'`
      );
    }
    // Update all community policies
    const communityPolicies: {
      id: string;
      member: string;
      lead: string;
      admin: string;
    }[] = await queryRunner.query(
      `SELECT id, community_policy.member, community_policy.lead, admin FROM community_policy`
    );
    for (const policy of communityPolicies) {
      await queryRunner.query(
        `UPDATE community_policy SET member = '${this.updateCredentialType(
          policy.member
        )}' WHERE id = '${policy.id}'`
      );
      await queryRunner.query(
        `UPDATE community_policy SET community_policy.lead = '${this.updateCredentialType(
          policy.lead
        )}' WHERE id = '${policy.id}'`
      );
      await queryRunner.query(
        `UPDATE community_policy SET admin = '${this.updateCredentialType(
          policy.admin
        )}' WHERE id = '${policy.id}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`community_policy\` DROP COLUMN \`host\``
    );
    await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`spaceId2\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private updateCredentialType(type: string): string {
    let result = type;
    result = result.replace('space-host', 'account-host');
    result = result.replace('challenge-', 'subspace-');
    result = result.replace('opportunity-', 'subspace-');
    return result;
  }
}
