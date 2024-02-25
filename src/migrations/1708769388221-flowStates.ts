import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';
import { createMachine } from 'xstate';

export class flowStates1708769388221 implements MigrationInterface {
  name = 'flowStates1708769388221';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // create new schema entries
    await queryRunner.query(
      `CREATE TABLE \`space_defaults\` (\`id\` char(36) NOT NULL,
                                        \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                        \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                        \`version\` int NOT NULL,
                                        \`challengeFlowStates\` text NOT NULL,
                                        \`opportunityFlowStates\` text NOT NULL,
                                        \`authorizationId\` char(36) NULL,
                                        UNIQUE INDEX \`REL_413ba75964e5a534e4bfa54846\` (\`authorizationId\`),
                                        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`states\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`states\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`defaultsId\` char(36) NULL`
    );

    // disable old constraints
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP FOREIGN KEY \`FK_4b4a68698d32f610a5fc1880c7f\``
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0af5c8e5c0a2f7858ae0a40c04\` ON \`innovation_flow\``
    );

    ////////////////////////////////////////
    // migrate data to new setup
    // Create new space defaults for all spaces, including default flows for challenges + opportunities. TODO: what about the old flows?
    const spaces: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM space`);
    for (const space of spaces) {
      // Create and link the Profile
      const defaultsID = randomUUID();
      const defaultsAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                      ('${defaultsAuthID}',
                      1, '', '', 0, '')`
      );

      // todo: Valentin: please check what I am doing re stringify...
      await queryRunner.query(
        `INSERT INTO space_defaults (id, version, challengeFlowStates, opportunityFlowStates, authorizationId) VALUES
                      ('${defaultsID}',
                      1,
                      '${this.convertStatesToText(
                        this.challengeFlowStatesDefault
                      )}',
                      '${this.convertStatesToText(
                        this.opportunityFlowStatesDefault
                      )}',
                      '${defaultsAuthID}')`
      );
      await queryRunner.query(
        `UPDATE space SET defaultsId = '${defaultsID}' WHERE id = '${space.id}'`
      );
    }
    // Iterate over all the innovation flow entries and also all the innovation flow templates to convert the states to the new format
    const innovationFlows: {
      id: string;
      lifecycleId: string;
    }[] = await queryRunner.query(
      `SELECT id, lifecycleId FROM innovation_flow`
    );
    for (const innovationFlow of innovationFlows) {
      const [lifecycle]: {
        id: string;
        machineDef: string;
      }[] = await queryRunner.query(
        `SELECT id, machineDef FROM lifecycle WHERE id = '${innovationFlow.lifecycleId}'`
      );

      // Convert the states to the new format
      const states = this.convertMachineDefinitionToStates(
        lifecycle.machineDef
      );

      //
      await queryRunner.query(
        `UPDATE innovation_flow SET states = '${this.convertStatesToText(
          states
        )}' WHERE id = '${innovationFlow.id}'`
      );
      await queryRunner.query(
        `DELETE FROM lifecycle WHERE id = '${lifecycle.id}'`
      );
    }

    // Iterate over all the innovation flow entries and also all the innovation flow templates to convert the states to the new format
    const innovationFlowTemplates: {
      id: string;
      definition: string;
    }[] = await queryRunner.query(
      `SELECT id, definition FROM innovation_flow_template`
    );
    for (const innovationFlowTemplate of innovationFlowTemplates) {
      // Convert the states to the new format
      const states = this.convertMachineDefinitionToStates(
        innovationFlowTemplate.definition
      );

      //
      await queryRunner.query(
        `UPDATE innovation_flow_template SET states = '${this.convertStatesToText(
          states
        )}' WHERE id = '${innovationFlowTemplate.id}'`
      );
    }

    // Add new constraints
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` (\`defaultsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\` (\`defaultsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_6b1efee39d076d9f7ecb8fef4cd\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // remove old data
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`definition\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`type\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`lifecycleId\``
    );

    await queryRunner.query(
      `ALTER TABLE \`templates_set\` DROP COLUMN \`policy\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // create new schema entries
    await queryRunner.query(
      `ALTER TABLE \`templates_set\` ADD \`policy\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`lifecycleId\` char(36) NULL`
    );

    // disable old constraints
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_413ba75964e5a534e4bfa54846e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_413ba75964e5a534e4bfa54846\` ON \`space_defaults\``
    );

    // migrate data to new setup

    // Add new constraints
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_0af5c8e5c0a2f7858ae0a40c04\` ON \`innovation_flow\` (\`lifecycleId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD CONSTRAINT \`FK_4b4a68698d32f610a5fc1880c7f\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // remove old data
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`defaultsId\``);
    await queryRunner.query(`DROP TABLE \`space_defaults\``);
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`states\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` DROP COLUMN \`states\``
    );
  }

  challengeFlowStatesDefault: FlowState[] = [
    {
      displayName: 'prepare',
      description: 'The innovation is being prepared.',
      sortOrder: 1,
    },
    {
      displayName: 'in progress',
      description: 'The innovation is in progress.',
      sortOrder: 2,
    },
    {
      displayName: 'summary',
      description: 'The summary of the flow results.',
      sortOrder: 3,
    },
    {
      displayName: 'done',
      description: 'The flow is completed.',
      sortOrder: 4,
    },
  ];

  opportunityFlowStatesDefault: FlowState[] = [
    {
      displayName: 'prepare',
      description: 'The innovation is being prepared.',
      sortOrder: 1,
    },
    {
      displayName: 'in progress',
      description: 'The innovation is in progress.',
      sortOrder: 2,
    },
    {
      displayName: 'summary',
      description: 'The summary of the flow results.',
      sortOrder: 3,
    },
    {
      displayName: 'done',
      description: 'The flow is completed.',
      sortOrder: 4,
    },
  ];

  private convertStatesToText(states: FlowState[]) {
    return `${escapeString(replaceSpecialCharacters(JSON.stringify(states)))}`;
  }

  private convertMachineDefinitionToStates(machineDefStr: string): FlowState[] {
    const result: FlowState[] = [];
    const machineDef = JSON.parse(machineDefStr);
    const machine = createMachine(machineDef);
    const states = machine.states;
    const stateNames = Object.keys(states);
    let sortOrder = 0;
    for (const stateName of stateNames) {
      result.push({
        displayName: stateName,
        description: `Enter here the description for the '${stateName}' state. This is a default description.`,
        sortOrder: sortOrder,
      });
      sortOrder++;
    }
    return result;
  }
}

export type FlowState = {
  displayName: string;
  description: string;
  sortOrder: number;
};
