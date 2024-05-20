import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class agentAccount1715957704292 implements MigrationInterface {
  name = 'agentAccount1715957704292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD \`agentId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD UNIQUE INDEX \`IDX_833582df0c439ab8c9adc5240d\` (\`agentId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_833582df0c439ab8c9adc5240d\` ON \`account\` (\`agentId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` ADD CONSTRAINT \`FK_833582df0c439ab8c9adc5240d1\` FOREIGN KEY (\`agentId\`) REFERENCES \`agent\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`issuer\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`credential\` ADD \`expires\` datetime(6) DEFAULT NULL`
    );

    // Create the agent on each account
    const accounts: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM account`);
    for (const account of accounts) {
      const accountAgentID = randomUUID();
      const accountAgentAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${accountAgentAuthID}',
                    1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO agent (id, version, authorizationId) VALUES
                ('${accountAgentID}',
                1,
                '${accountAgentAuthID}')`
      );
      await queryRunner.query(
        `UPDATE account SET agentId = '${accountAgentID}' WHERE id = '${account.id}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
