import { MigrationInterface, QueryRunner } from 'typeorm';

export class InnovationFlowStates1740065242887 implements MigrationInterface {
  name = 'InnovationFlowStates1740065242887';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`settings\` json NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` CHANGE \`states\` \`states\` json NOT NULL`
    );

    // Update all L0 spaces, L1/L2 Spaces
    const spaces: {
      spaceId: string;
      level: number;
      collaborationId: string | null;
      innovationFlowId: string | null;
    }[] = await queryRunner.query(
      `SELECT
          s.id AS spaceId,
          s.level,
          s.collaborationId,
          c.innovationFlowId
        FROM \`space\` s
        LEFT JOIN \`collaboration\` c ON s.collaborationId = c.id`
    );
    for (const space of spaces) {
      if (!space.innovationFlowId) {
        console.error(
          `Space ${space.spaceId} does not have an innovation flow.`
        );
        break;
      }
      await this.updateInnovationFlow(
        queryRunner,
        space.innovationFlowId,
        space.level
      );
    }

    // Update all templates
    const templates: {
      templateId: string;
      nameID: string;
      collaborationId: string | null;
      innovationFlowId: string | null;
    }[] = await queryRunner.query(
      `SELECT
          s.id AS templateId,
          s.nameID,
          s.collaborationId,
          c.innovationFlowId
        FROM \`template\` s
        LEFT JOIN \`collaboration\` c ON s.collaborationId = c.id
        WHERE type='collaboration'`
    );
    for (const template of templates) {
      if (!template.innovationFlowId) {
        console.error(
          `Template ${template.innovationFlowId} does not have an innovation flow.`
        );
        break;
      }
      if (template.nameID === 'spacetemplate') {
        await this.updateInnovationFlow(
          queryRunner,
          template.innovationFlowId,
          0
        );
      } else {
        await this.updateInnovationFlow(
          queryRunner,
          template.innovationFlowId,
          1
        );
      }
    }
  }

  private async updateInnovationFlow(
    queryRunner: QueryRunner,
    innovationFlowId: string,
    level: number
  ) {
    switch (level) {
      case 0:
        await queryRunner.query(
          `UPDATE \`innovation_flow\` SET settings = '${JSON.stringify(
            spaceFlowSettings
          )}' WHERE id = '${innovationFlowId}'`
        );
        // also update the states
        await queryRunner.query(
          `UPDATE \`innovation_flow\` SET states = '${JSON.stringify(
            spaceFlowStates.states
          )}' WHERE id = '${innovationFlowId}'`
        );
        break;
      case 1:
      case 2:
        await queryRunner.query(
          `UPDATE \`innovation_flow\` SET settings = '${JSON.stringify(
            subspaceFlowSettings
          )}' WHERE id = '${innovationFlowId}'`
        );
        break;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` DROP COLUMN \`settings\``
    );
  }
}

enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

const spaceFlowSettings = {
  maximumNumberOfStates: 5,
  minimumNumberOfStates: 4,
};

const subspaceFlowSettings = {
  maximumNumberOfStates: 8,
  minimumNumberOfStates: 1,
};

const spaceFlowStates = {
  states: [
    {
      displayName: FlowState.HOME,
      description:
        '🔍 A journey of discovery! Gather insights through research and observation.',
    },
    {
      displayName: FlowState.COMMUNITY,
      description: '🔍 The contributors to this Space!',
    },
    {
      displayName: FlowState.SUBSPACES,
      description:
        '🔍 Here you can explore the hosted Subspaces. Filter by key words to show just the topics you care about.',
    },
    {
      displayName: FlowState.KNOWLEDGE,
      description:
        '🔍 In the Knowledge Base you will find relevant documents, insights and other materials about the topic. The leads of the Space can provide the content, but also community members can contribute.',
    },
  ],
};
