import { cloneDeep } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

type InnovationFlowState = {
  displayName: string;
  description: string;
};

export class SpaceDescription1743416333189 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const WRONG_STATE_DISPLAYNAME = 'Home';
    const WRONG_STATE_DESCRIPTION =
      '🔍 A journey of discovery! Gather insights through research and observation.';

    const spaces: {
      spaceId: string;
      spaceDescription: string;
      innovationFlowId: string;
      innovationFlowStates: InnovationFlowState[];
      innovationFlowCurrentState: InnovationFlowState;
    }[] = await queryRunner.query(
      `
        SELECT
          space.id as spaceId,
          profile.description as spaceDescription,
          innovation_flow.id as innovationFlowId,
          innovation_flow.states as innovationFlowStates,
          innovation_flow.currentState as innovationFlowCurrentState
        FROM space
          JOIN space_about ON space.aboutId = space_about.id
          JOIN profile ON space_about.profileId = profile.id
          JOIN collaboration ON space.collaborationId = collaboration.id
          JOIN innovation_flow ON collaboration.innovationFlowId = innovation_flow.id
        WHERE space.level = 0
      `
    );

    for (const space of spaces) {
      const {
        innovationFlowId,
        spaceDescription,
        innovationFlowStates,
        innovationFlowCurrentState,
      } = space;
      const newStates = cloneDeep(innovationFlowStates);
      if (!newStates || !newStates.length) {
        console.log(
          `Space ${space.spaceId} with InnovationFlow ${innovationFlowId} has no states`
        );
        continue;
      }

      if (
        newStates[0].displayName !== WRONG_STATE_DISPLAYNAME &&
        newStates[0].description !== WRONG_STATE_DESCRIPTION
      ) {
        console.log(
          `Space ${space.spaceId} had already changed the first IF state so we keep the current value: '${newStates[0].displayName}' '${newStates[0].description}'`
        );
        continue;
      }
      newStates[0].description = spaceDescription;

      const newCurrentState = cloneDeep(innovationFlowCurrentState);
      if (newCurrentState.displayName === WRONG_STATE_DISPLAYNAME) {
        newCurrentState.description = spaceDescription;
      }

      console.log(
        `Updating Space ${space.spaceId} with InnovationFlow ${innovationFlowId} changing first state from '${innovationFlowStates[0].description}' to '${spaceDescription}'`
      );
      await queryRunner.query(
        `
          UPDATE innovation_flow SET states = ?, currentState = ? WHERE id = ?
      `,
        [
          JSON.stringify(newStates),
          JSON.stringify(newCurrentState),
          innovationFlowId,
        ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
