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
                                        \`innovationFlowTemplateId\` char(36) NULL,
                                        \`authorizationId\` char(36) NULL,
                                        UNIQUE INDEX \`REL_413ba75964e5a534e4bfa54846\` (\`authorizationId\`),
                                        PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`states\` text NOT NULL DEFAULT ('[]')`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`states\` text NOT NULL DEFAULT ('[]')`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`defaultsId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`innovationFlowId\` char(36) DEFAULTNULL`
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
    // a. Create new space defaults for all spaces, including default flows for challenges + opportunities. TODO: what about the old flows?
    const spaces: {
      id: string;
      templatesSetId: string;
    }[] = await queryRunner.query(`SELECT id, templatesSetId FROM space`);
    for (const space of spaces) {
      // Get the default innovation flow template to use
      const innovation_flow_templates: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM innovation_flow_template WHERE id = '${space.templatesSetId}'`
      );
      // Pick up the first one if there is an innovation flow template; otherwise, use the default
      let innovationTemplateID: string | null = null;
      if (innovation_flow_templates.length > 0) {
        innovationTemplateID = innovation_flow_templates[0].id;
      }

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
        `INSERT INTO space_defaults (id, version, innovationFlowTemplateId, authorizationId) VALUES
                      ('${defaultsID}',
                      1,
                      '${innovationTemplateID}',
                      '${defaultsAuthID}')`
      );
      await queryRunner.query(
        `UPDATE space SET defaultsId = '${defaultsID}' WHERE id = '${space.id}'`
      );
    }

    // b. Iterate over all the innovation flow entries and also all the innovation flow templates to convert the states to the new format
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

    // c. Iterate over all the innovation flow entries and also all the innovation flow templates to convert the states to the new format
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
    // d. Move the InnovationFlows to be on Collaboration for Challenges + Opportunities
    const challenges: {
      id: string;
      innovationFlowId: string;
      collaborationId: string;
    }[] = await queryRunner.query(
      `SELECT id, innovationFlowId, collaborationId FROM challenge`
    );
    for (const challenge of challenges) {
      //
      await queryRunner.query(
        `UPDATE collaboration SET innovationFlowId = '${challenge.innovationFlowId}' WHERE id = '${challenge.collaborationId}'`
      );
    }
    const opportunities: {
      id: string;
      innovationFlowId: string;
      collaborationId: string;
    }[] = await queryRunner.query(
      `SELECT id, innovationFlowId, collaborationId FROM opportunity`
    );
    for (const opportunity of opportunities) {
      //
      await queryRunner.query(
        `UPDATE collaboration SET innovationFlowId = '${opportunity.innovationFlowId}' WHERE id = '${opportunity.collaborationId}'`
      );
    }
    const spaces2: {
      id: string;
      collaborationId: string;
      storageAggregatorId: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId, storageAggregatorId FROM space`
    );
    for (const space of spaces2) {
      const newInnovationFlowId = await this.createInnovationFlow(
        queryRunner,
        space.storageAggregatorId
      );
      await queryRunner.query(
        `UPDATE collaboration SET innovationFlowId = '${newInnovationFlowId}' WHERE id = '${space.collaborationId}'`
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

    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD UNIQUE INDEX \`IDX_413ba75964e5a534e4bfa54846\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_413ba75964e5a534e4bfa54846e\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    // TBD: also need a REL?
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD UNIQUE INDEX \`IDX_666ba75964e5a534e4bfa54846\` (\`innovationFlowTemplateId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` ADD CONSTRAINT \`FK_666ba75964e5a534e4bfa54846e\` FOREIGN KEY (\`innovationFlowTemplateId\`) REFERENCES \`innovation_flow_template\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
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
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`spaceID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`type\``
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` DROP COLUMN \`innovationFlowId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` DROP COLUMN \`innovationFlowId\``
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
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`spaceID\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`type\` varchar(128) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`innovationFlowId\` char(36) DEFAULTNULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`innovationFlowId\` char(36) DEFAULTNULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`definition\` text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_template\` ADD \`type\` varchar(128) NULL`
    );

    // disable old constraints
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP FOREIGN KEY \`FK_6b1efee39d076d9f7ecb8fef4cd\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` DROP INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_6b1efee39d076d9f7ecb8fef4c\` ON \`space\``
    );

    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_413ba75964e5a534e4bfa54846e\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_413ba75964e5a534e4bfa54846\` ON \`space_defaults\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP INDEX \`IDX_413ba75964e5a534e4bfa54846\``
    );

    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP FOREIGN KEY \`FK_666ba75964e5a534e4bfa54846e\``
    );
    await queryRunner.query(
      `ALTER TABLE \`space_defaults\` DROP INDEX \`IDX_666ba75964e5a534e4bfa54846\``
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
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`innovationFlowId\``
    );
  }

  innovationFlowStatesDefault: FlowState[] = [
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
    if (machineDefStr === '') {
      // if no definition, just return the default
      return this.innovationFlowStatesDefault;
    }
    const result: FlowState[] = [];
    const machineDef = JSON.parse(machineDefStr);
    const machine = createMachine(machineDef);
    const states = machine.states;
    const stateNames = Object.keys(states);
    let sortOrder = 0;
    for (const stateName of stateNames) {
      result.push({
        displayName: stateName,
        description: '',
        sortOrder: sortOrder,
      });
      sortOrder++;
    }
    return result;
  }

  private async createInnovationFlow(
    queryRunner: QueryRunner,
    storageAggregatorID: String
  ): Promise<string> {
    // Create and link the Profile
    const innovationFlowID = randomUUID();
    const innovationFlowAuthID = randomUUID();

    const profileID = randomUUID();
    const profileAuthID = randomUUID();

    const locationID = randomUUID();
    const storageBucketID = randomUUID();
    const storageBucketAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${innovationFlowAuthID}',
                1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${profileAuthID}',
                1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
                ('${storageBucketAuthID}',
                1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO location VALUES
        ('${locationID}', DEFAULT, DEFAULT, 1, '', '', '' ,'', '', '')`
    );

    await queryRunner.query(
      `INSERT INTO storage_bucket (id, version, storageAggregatorId, authorizationId) VALUES
                ('${storageBucketID}',
                1,
                '${storageAggregatorID}',
                '${storageBucketAuthID}')`
    );

    await queryRunner.query(
      `INSERT INTO profile (id, version, displayName, description, type, authorizationId) VALUES
                ('${profileID}',
                1,
                'innovationFlow',
                '',
                'innovation-flow',
                '${profileAuthID}')`
    );

    const statesStr = this.convertStatesToText(
      this.innovationFlowStatesDefault
    );
    await queryRunner.query(
      `INSERT INTO innovation_flow (id, version, authorizationId, profileId) VALUES
                ('${innovationFlowID}',
                1, 
                '${innovationFlowAuthID}', 
                '${profileID}'
                '${statesStr})`
    );

    return innovationFlowID;
  }
}

export type FlowState = {
  displayName: string;
  description: string;
  sortOrder: number;
};
