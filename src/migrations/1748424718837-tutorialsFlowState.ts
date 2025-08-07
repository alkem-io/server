import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TutorialsFlowState1748424718837 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the calloutsSetId from the collaboration associated with the platform space tutorials template
    const [collaboration]: { calloutsSetId: string }[] =
      await queryRunner.query(
        `SELECT calloutsSetId FROM collaboration WHERE id = (
          SELECT collaborationId FROM template WHERE id = (
            SELECT templateId FROM template_default WHERE templatesManagerId IN (
              SELECT templatesManagerId FROM platform
            ) AND type = 'platform-space-tutorials'
          )
        )`
      );
    if (!collaboration) {
      console.warn(
        'No collaboration found for platform space tutorials template. Skipping flow state updates.'
      );
      return;
    }
    const { calloutsSetId } = collaboration;

    // Get the callouts of the tutorial
    const callouts: {
      id: string;
      nameId: string;
      classificationTagsetId: string;
      currentFlowState: string;
      currentSortOrder: number;
    }[] = await queryRunner.query(
      `
          SELECT
            callout.id,
            callout.nameId,
            tagset.id AS classificationTagsetId,
            tagset.tags AS currentFlowState,
            callout.sortOrder as currentSortOrder
          FROM callout
            JOIN tagset ON tagset.classificationID = callout.classificationId AND tagset.name = 'flow-state'
          WHERE calloutsSetId = ?`,
      [calloutsSetId]
    );

    for (const callout of callouts) {
      // tutorialCallouts are the hardcoded callouts in the bootstrap file
      const tutorialCallout = this.findTutorialCallout(callout.nameId);
      if (!tutorialCallout) {
        console.warn(
          `No tutorial callout found for nameId: ${callout.nameId}. This callout will be skipped.`
        );
        continue;
      }
      const { flowState: expectedFlowState, sortOrder: expectedSortOrder } =
        tutorialCallout;

      if (callout.currentFlowState !== expectedFlowState) {
        console.log(
          `Updating flow state for callout: ${callout.id} ${callout.nameId} from ${callout.currentFlowState} to ${expectedFlowState}`
        );
        await queryRunner.query(
          `
          UPDATE tagset SET tags = ? WHERE id = ?
        `,
          [expectedFlowState, callout.classificationTagsetId]
        );
      }
      if (callout.currentSortOrder !== expectedSortOrder) {
        console.log(
          `Updating sortOrder for callout: ${callout.id} ${callout.nameId} from ${callout.currentSortOrder} to ${expectedSortOrder}`
        );
        await queryRunner.query(
          `
          UPDATE callout SET sortOrder = ? WHERE id = ?
        `,
          [expectedSortOrder, callout.id]
        );
      }
    }
  }

  // Get the tutorial callout from the hardcoded bootstrap file
  private findTutorialCallout(nameId: string) {
    const tutorialCallout = bootstrapSpaceTutorialsCallouts.find(
      c => c.nameID === nameId
    );
    if (!tutorialCallout) {
      return undefined;
    }
    const classificationTagset = tutorialCallout.classification?.tagsets.find(
      tagset => tagset.name === TagsetReservedName.FLOW_STATE
    );
    if (!classificationTagset) {
      // This should not happen, the tutorials are hardcoded in that file
      throw new Error(
        `No classification tagset found for tutorial callout: ${nameId}`
      );
    }
    const flowState = classificationTagset.tags?.[0];
    if (!flowState) {
      throw new Error(
        `No expected flow state found for tutorial callout: ${nameId}`
      );
    }

    return {
      flowState,
      sortOrder: tutorialCallout.sortOrder,
    };
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

export enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

const bootstrapSpaceTutorialsCallouts = [
  {
    nameID: 'welcome',

    sortOrder: 1,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.HOME],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '👋 Welcome to your space!',
        description:
          "Take an interactive tour below to discover how our spaces are designed. We also invite you to explore the other tutorials available on this page and beyond. We're excited to have you here! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/zVYe3x4PkZjUkMEMP9Kg?embed&show_copy_link=true' title='👋 Welcome to your space' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
      },
    },
  },
  {
    nameID: 'space-setup',
    sortOrder: 2,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.HOME],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '⚙️ Set it up your way!',
        description:
          "In this concise guide, you'll discover how to customize your Space to suit your needs. Learn more about how to set the visibility of the Space, how people can join, and what essential information to include on the about page. Let's get started! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/Rbwhpk4zro3Uer61iQKL?embed&show_copy_link=true' title='⚙️ Set it up your way!' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
      },
    },
  },
  {
    nameID: 'collaboration-tools',
    sortOrder: 3,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.HOME],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '🧩 Collaboration tools',
        description:
          "Collaboration tools allow you to gather existing knowledge from your community and (co-)create new insights through text and visuals. In the tour below you will learn all about the different tools and how to use them. Enjoy! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/ItWjHrsXuFfVr0E7Epbo?embed&show_copy_link=true' title='Collaboration Tools' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
      },
    },
  },
  {
    nameID: 'cleaning-up',
    sortOrder: 4,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.HOME],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '🧹 Cleaning up',
        description:
          'Done with the tutorials and ready to build up this Space/Subspace your way? You can move the tutorials or delete them completely. \n\n*   To move in a Space:\n\n    *   Go to the settings using the ⚙️ icon on the top right of the space \n    *   Go to the LAYOUT tab \n    *   Drag the tool to the page you want\n\n* To move in a Subspace:\n\n    *   Go to the innovation flow and click on the icon to manage the flow \n    *   Drag the tool to the phase you want\n\n*   To remove:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Delete\n    *   Confirm \n\n You can always find the tutorials in the [tutorials template pack](https://alkem.io/innovation-packs/newspace) and in the [documentation](https://alkem.io/docs/how-to/tutorials.en-US).',
      },
    },
  },
  {
    nameID: 'community-setup',

    sortOrder: 1,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.COMMUNITY],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '🤝 Set up your Community',
        description:
          "In this tour, you'll discover how to define permissions, create guidelines, set up an application process, and send out invitations. Let's get started! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/guBQToL8DWsnjCE7GLve?embed&show_copy_link=true'title='🏘️ Set up your Community' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>",
      },
    },
  },
  {
    nameID: 'about-subspaces',
    sortOrder: 1,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.SUBSPACES],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '↪️ Subspaces',
        description:
          "Below, we'll explore the concept of Subspaces. You will learn more about what to use these Subspaces for, what functionality is available, and how you can guide the process using an Innovation Flow. \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/gekGPsfEADYWHGaB0QKW?embed&show_copy_link=true' title='Subspaces' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
      },
    },
  },
  {
    nameID: 'about-knowledge-base',
    sortOrder: 1,
    classification: {
      tagsets: [
        {
          name: TagsetReservedName.FLOW_STATE,
          tags: [FlowState.KNOWLEDGE],
        },
      ],
    },
    framing: {
      profile: {
        displayName: '📚 The Knowledge Base',
        description:
          "Welcome to your knowledge base! This page serves as a central repository for valuable information and references that are relevant for the entire community.\n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/pSXpCpds3Mcdibk8LhBE?embed&show_copy_link=true' title='Knowledge Base' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
      },
    },
  },
];
