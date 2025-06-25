import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ICalloutSettings } from '@domain/collaboration/callout-settings/callout.settings.interface';
import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Copy of two enums that have been removed from the codebase.
 */
enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}
enum CalloutState {
  OPEN = 'open',
  CLOSED = 'closed',
  // ARCHIVED = 'archived', // I haven't seen any callout in Archived state in Acceptance, and new code is not handling it properly, so fail migration if we encounter it
}

export class CalloutsRefresh1750679255135 implements MigrationInterface {
  name = 'CalloutsRefresh1750679255135';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD \`type\` varchar(128) NOT NULL DEFAULT 'none'`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`settings\` json NOT NULL`
    );

    const callouts: {
      id: string;
      type: string;
      visibility: string;
      framingId: string;
      allowedContributionTypes: string;
      state: string;
    }[] = await queryRunner.query(`
      SELECT
        \`callout\`.\`id\`,
        \`callout\`.\`type\`,
        \`callout\`.\`visibility\`,
        \`callout\`.\`framingId\`,
        \`callout_contribution_policy\`.\`allowedContributionTypes\` AS \`allowedContributionTypes\`,
        \`callout_contribution_policy\`.\`state\` AS \`state\`
        FROM \`callout\`
        JOIN \`callout_contribution_policy\` ON \`callout\`.\`contributionPolicyId\` = \`callout_contribution_policy\`.\`id\`;
      `);

    for (const callout of callouts) {
      const framingType =
        callout.type === CalloutType.WHITEBOARD
          ? CalloutFramingType.WHITEBOARD
          : CalloutFramingType.NONE;
      await queryRunner.query(
        `UPDATE \`callout_framing\` SET \`type\` = ? WHERE \`id\` = ?`,
        [framingType, callout.framingId]
      );

      const parsedVisibility = this.parseCalloutVisibility(callout.visibility);
      const parsedState = this.parseCalloutState(callout.state);

      const settingsObject: ICalloutSettings = {
        visibility: parsedVisibility,
        framing: {
          commentsEnabled:
            callout.type === CalloutType.POST &&
            parsedState === CalloutState.OPEN,
        },
        contribution: {
          enabled: false,
          canAddContributions: CalloutAllowedContributors.MEMBERS,
          allowedTypes: [],
          commentsEnabled: true,
        },
      };
      if (callout.type === CalloutType.LINK_COLLECTION) {
        settingsObject.contribution.enabled = true;
        settingsObject.contribution.allowedTypes = [
          CalloutContributionType.LINK,
        ];
      }
      if (callout.type === CalloutType.POST_COLLECTION) {
        settingsObject.contribution.enabled = true;
        settingsObject.contribution.allowedTypes = [
          CalloutContributionType.POST,
        ];
      }
      if (callout.type === CalloutType.WHITEBOARD_COLLECTION) {
        settingsObject.contribution.enabled = true;
        settingsObject.contribution.allowedTypes = [
          CalloutContributionType.WHITEBOARD,
        ];
      }
      if (parsedState === CalloutState.CLOSED) {
        settingsObject.contribution.enabled = false;
      }
      await queryRunner.query(
        `UPDATE \`callout\` SET \`settings\` = ? WHERE \`id\` = ?`,
        [JSON.stringify(settingsObject), callout.id]
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_1e740008a7e1512966e3b084148\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`contributionPolicyId\``
    );
    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`visibility\``
    );
    await queryRunner.query(`DROP TABLE \`callout_contribution_policy\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`callout_contribution_policy\` (
      \`id\` char(36) NOT NULL,
      \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`version\` int NOT NULL,
      \`allowedContributionTypes\` text NOT NULL,
      \`state\` varchar(128) NOT NULL,
      PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`visibility\` varchar(128) NOT NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`type\` text NOT NULL;`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`contributionPolicyId\` char(36) NULL;`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1e740008a7e1512966e3b08414\` ON \`callout\` (\`contributionPolicyId\`);`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_1e740008a7e1512966e3b084148\` FOREIGN KEY (\`contributionPolicyId\`) REFERENCES \`callout_contribution_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION;`
    );

    const callouts: {
      id: string;
      settings: ICalloutSettings;
      framingId: string;
      framingType: CalloutFramingType;
    }[] = await queryRunner.query(`
      SELECT \
        \`callout\`.\`id\`, \
        \`callout\`.\`settings\`, \
        \`callout\`.\`framingId\`, \
        \`callout_framing\`.\`type\` AS \`framingType\`
      FROM \`callout\` JOIN
        \`callout_framing\` ON \`callout\`.\`framingId\` = \`callout_framing\`.\`id\`;
    `);

    for (const callout of callouts) {
      const settings = callout.settings;

      const visibility = settings.visibility;
      const state = settings.contribution.enabled ? 'open' : 'closed';
      const allowedContributionTypes =
        settings.contribution.allowedTypes.join(',');

      const newContributionPolicyId = randomUUID();
      await queryRunner.query(
        `INSERT INTO \`callout_contribution_policy\`
        (\`id\`, \`version\`, \`allowedContributionTypes\`, \`state\`) VALUES (?, ?, ?, ?);`,
        [newContributionPolicyId, 1, allowedContributionTypes, state]
      );
      let calloutType = 'post';
      if (allowedContributionTypes.includes(CalloutContributionType.LINK)) {
        calloutType = CalloutType.LINK_COLLECTION;
      } else if (
        allowedContributionTypes.includes(CalloutContributionType.POST)
      ) {
        calloutType = CalloutType.POST_COLLECTION;
      } else if (
        allowedContributionTypes.includes(CalloutContributionType.WHITEBOARD)
      ) {
        calloutType = CalloutType.WHITEBOARD_COLLECTION;
      }
      if (callout.framingType === CalloutFramingType.WHITEBOARD) {
        calloutType = CalloutType.WHITEBOARD;
      }

      await queryRunner.query(
        `UPDATE \`callout\` SET \`visibility\` = ?, \`type\` = ?, \`contributionPolicyId\` = ? WHERE \`id\` = ?;`,
        [visibility, calloutType, newContributionPolicyId, callout.id]
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP COLUMN \`settings\`;`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP COLUMN \`type\`;`
    );
  }

  private parseCalloutVisibility(visibility: string): CalloutVisibility {
    // Validate callout.visibility against the enum
    if (
      !Object.values(CalloutVisibility).includes(
        visibility as CalloutVisibility
      )
    ) {
      throw new Error(`Invalid callout Visibility value: ${visibility}`);
    }
    return visibility as CalloutVisibility;
  }

  private parseCalloutState(state: string): CalloutState {
    // Validate callout.State against the enum
    if (!Object.values(CalloutState).includes(state as CalloutState)) {
      throw new Error(`Invalid callout State value: ${state}`);
    }
    return state as CalloutState;
  }
}
