import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

interface InnovationFlow {
  id: string;
  states: {
    displayName: string;
    description: string;
  }[];
  currentState: {
    displayName: string;
  } | null;
}

export class InnovationFlowState1752257104122 implements MigrationInterface {
  name = 'InnovationFlowState1752257104122';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`innovation_flow_state\` (\`id\` char(36) NOT NULL,
                                                                          \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                                                          \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                                                          \`version\` int NOT NULL,
                                                                          \`displayName\` text NOT NULL,
                                                                          \`description\` text NULL,
                                                                          \`settings\` json NOT NULL,
                                                                          \`sortOrder\` int NOT NULL,
                                                                          \`authorizationId\` char(36) NULL,
                                                                          \`innovationFlowId\` char(36) NULL,
                                                                          UNIQUE INDEX \`REL_83d9f1d85d3ca51828168ea336\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`currentStateID\` char(36) NULL`
    );

    // For all innovation flows, we need to create a new innovation_flow_state instance using the existing states
    const innovationFlows: InnovationFlow[] = await queryRunner.query(`
      SELECT id, states, currentState FROM innovation_flow
    `);
    for (const flow of innovationFlows) {
      const currentStateDisplayName = flow.currentState?.displayName;
      let currentStateId = undefined;
      let sortOrder = 1;
      for (const state of flow.states) {
        const authID = await this.createAuthorizationPolicy(queryRunner);
        const stateID = randomUUID();
        if (!state.displayName) {
          console.warn(
            `Skipping state with no displayName for flow ${flow.id}`
          );
          continue;
        }

        if (currentStateId === undefined) {
          currentStateId = stateID; // Store the first state ID in case we don't find a state with a displayName equal to the current state
        }
        await queryRunner.query(
          `INSERT INTO innovation_flow_state (id, version, displayName, description, settings, sortOrder, authorizationId, innovationFlowId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            stateID,
            1,
            state.displayName,
            state.description ?? '',
            JSON.stringify({ allowNewCallouts: true }),
            sortOrder,
            authID,
            flow.id,
          ]
        );
        sortOrder += 10;
        // and update the current state ID if matching
        if (state.displayName === currentStateDisplayName) {
          currentStateId = stateID;
        }
      }
      await this.setCurrentState(queryRunner, flow.id, currentStateId!);
    }
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`states\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`currentState\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_state\` ADD CONSTRAINT \`FK_83d9f1d85d3ca51828168ea3367\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_state\` ADD CONSTRAINT \`FK_73db98435e680e2a2dada61e815\` FOREIGN KEY (\`innovationFlowId\`) REFERENCES \`innovation_flow\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_state\` DROP FOREIGN KEY \`FK_73db98435e680e2a2dada61e815\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow_state\` DROP FOREIGN KEY \`FK_83d9f1d85d3ca51828168ea3367\``
    );
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`states\` json NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_83d9f1d85d3ca51828168ea336\` ON \`innovation_flow_state\``
    );
    await queryRunner.query(`DROP TABLE \`innovation_flow_state\``);
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [authID, 1, '[]', '[]', '[]', 'innovation-flow-state']
    );
    return authID;
  }

  private async setCurrentState(
    queryRunner: QueryRunner,
    flowID: string,
    stateID: string
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE innovation_flow SET currentStateID = ? WHERE id = ?`,
      [stateID, flowID]
    );
  }
}
