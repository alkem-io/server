import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class aiServerSetup1718860939735 implements MigrationInterface {
  name = 'aiServerSetup1718860939735';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`ai_persona\` (
                                                        \`id\` char(36) NOT NULL,
                                                        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                        \`version\` int NOT NULL, \`description\` text NULL,
                                                        \`authorizationId\` char(36) NULL,
                                                        UNIQUE INDEX \`REL_293f0d3ef60cb0ca0006044ecf\` (\`authorizationId\`),
                                                        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`ai_server\` (
                                                        \`id\` char(36) NOT NULL,
                                                        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                        \`version\` int NOT NULL, \`authorizationId\` char(36) NULL,
                                                        \`defaultAiPersonaServiceId\` char(36) NULL,
                                                        UNIQUE INDEX \`REL_9d520fa5fed56042918e48fc4b\` (\`authorizationId\`), UNIQUE INDEX \`REL_8926f3b8a0ae47076f8266c9aa\` (\`defaultAiPersonaServiceId\`),
                                                        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(`CREATE TABLE \`ai_persona_service\` (
                                                        \`id\` char(36) NOT NULL,
                                                        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                        \`version\` int NOT NULL,
                                                        \`engine\` varchar(128) NOT NULL,
                                                        \`dataAccessMode\` varchar(64) NOT NULL DEFAULT 'space_profile',
                                                        \`prompt\` text NOT NULL, \`bodyOfKnowledgeType\` varchar(64) NULL,
                                                        \`bodyOfKnowledgeID\` varchar(255) NULL, \`authorizationId\` char(36) NULL,
                                                        \`aiServerId\` char(36) NULL, UNIQUE INDEX \`REL_79206feb0038b1c5597668dc4b\` (\`authorizationId\`),
                                                        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`listedInStore\` tinyint NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`searchVisibility\` varchar(36) NOT NULL DEFAULT 'account'`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD \`aiPersonaId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD UNIQUE INDEX \`IDX_55b8101bdf4f566645e928c26e\` (\`aiPersonaId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_55b8101bdf4f566645e928c26e\` ON \`virtual_contributor\` (\`aiPersonaId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` ADD CONSTRAINT \`FK_55b8101bdf4f566645e928c26e3\` FOREIGN KEY (\`aiPersonaId\`) REFERENCES \`ai_persona\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    // Drop the existing FK constraints related to Virtual Persona
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP FOREIGN KEY \`FK_0e5ff0df260179127b43731bb68\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_persona\` DROP FOREIGN KEY \`FK_f5b93c5a204483c3563c7c434a4\` `
    );

    //////////////////////////////////////
    // Migrate the data

    // The approach being taken is to create a new AI Persona and AI Persona Service for each Virtual Contributor
    // This may result in maybe too many AI Persona and AI Persona Service records, but it is the most straight forward way to do it, and also guarantees that we get the account setup right

    // Create the AI Server entity
    const aiServerID = randomUUID();
    const aiServerAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                  ('${aiServerAuthID}',
                  1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO ai_server (id, version, authorizationId) VALUES
              ('${aiServerID}',
              1,
              '${aiServerAuthID}')`
    );

    // Loop over all VCs
    const virtualContributors: {
      id: string;
      virtualPersonaId: string;
    }[] = await queryRunner.query(
      `SELECT id, virtualPersonaId FROM virtual_contributor`
    );
    for (const vc of virtualContributors) {
      const [virtualPersona]: { id: string; licensePolicyId: string }[] =
        await queryRunner.query(
          `SELECT id, licensePolicyId FROM virtual_persona WHERE id = '${vc.virtualPersonaId}'`
        );
      if (!virtualPersona) {
        console.log(
          `unable to identify virtual persona for virtual contributor ${vc.id}`
        );
        continue;
      }

      // Create + populate the AI Persona Service
      const aiPersonaServiceID = randomUUID();
      const aiPersonaServiceAuthID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${aiPersonaServiceAuthID}',
                    1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO ai_persona_service (id, version, authorizationId, aiServerId) VALUES
                ('${aiPersonaServiceID}',
                1,
                '${aiPersonaServiceAuthID}',
                '${aiServerID}')`
      );

      // Create + populate the AI Persona
      const aiPersonaID = randomUUID();
      const aiPersonaAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                    ('${aiPersonaAuthID}',
                    1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO ai_persona (id, version, authorizationId) VALUES
                ('${aiPersonaID}',
                1,
                '${aiPersonaAuthID}')`
      );
      await queryRunner.query(
        `UPDATE vitual_contributor SET aiPersonaId = '${aiPersonaID}' WHERE id = '${vc.id}'`
      );
    }

    //////////////////////////////////////
    // Clean up the old structure / data

    await queryRunner.query(
      `ALTER TABLE virtual_contributor DROP CONSTRAINT FK_5c6f158a128406aafb9808b3a82`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona\` ADD CONSTRAINT \`FK_293f0d3ef60cb0ca0006044ecfd\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`ai_server\` ADD CONSTRAINT \`FK_9d520fa5fed56042918e48fc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_server\` ADD CONSTRAINT \`FK_8926f3b8a0ae47076f8266c9aa1\` FOREIGN KEY (\`defaultAiPersonaServiceId\`) REFERENCES \`ai_persona_service\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD CONSTRAINT \`FK_79206feb0038b1c5597668dc4b5\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`ai_persona_service\` ADD CONSTRAINT \`FK_b9f20da98058d7bd474152ed6ce\` FOREIGN KEY (\`aiServerId\`) REFERENCES \`ai_server\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    // And clean up data as last...
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`bodyOfKnowledgeID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`bodyOfKnowledgeType\``
    );
    await queryRunner.query(
      `ALTER TABLE \`virtual_contributor\` DROP COLUMN \`virtualPersonaId\``
    );
    await queryRunner.query(`DROP TABLE \`virtual_persona\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
