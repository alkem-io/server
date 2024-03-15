import { MigrationInterface, QueryRunner } from 'typeorm';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

export class calloutGroups1710272553085 implements MigrationInterface {
  name = 'calloutGroups1710272553085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`groups\` text NOT NULL DEFAULT ('[]')`
    );

    await this.addCalloutGroups(queryRunner, 'space', this.spaceCalloutGroups);
    await this.addCalloutGroups(
      queryRunner,
      'challenge',
      this.subspaceCalloutGroups
    );
    await this.addCalloutGroups(
      queryRunner,
      'opportunity',
      this.subspaceCalloutGroups
    );

    // TODO: update the name + entries for old display location tagsets
    // 'CHALLENGES_1', 'OPPORTUNITIES_1' ==> SUBSPACES_1
    // 'CHALLENGES_2', 'OPPORTUNITIES_2' ==> SUBSPACES_2
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`groups\``
    );
  }

  private async addCalloutGroups(
    queryRunner: QueryRunner,
    journeyType: string,
    calloutGroups: CalloutGroup[]
  ) {
    const journeys: {
      id: string;
    }[] = await queryRunner.query(`SELECT id FROM ${journeyType}`);
    for (const journey of journeys) {
      await queryRunner.query(
        `UPDATE ${journeyType} SET defaults = '${this.convertGroupsToText(
          calloutGroups
        )}' WHERE id = '${journey.id}'`
      );
    }
  }

  spaceCalloutGroups: CalloutGroup[] = [
    {
      displayName: 'HOME_1',
      description: 'The left column on the Home page.',
    },
    {
      displayName: 'HOME_2',
      description: 'The right column on the Home page.',
    },
    {
      displayName: 'COMMUNITY_1',
      description: 'The left column on the Community page.',
    },
    {
      displayName: 'COMMUNITY_2',
      description: 'The right column on the Community page.',
    },
    {
      displayName: 'SUBSPACES_1',
      description: 'The left column on the Subspaces page.',
    },
    {
      displayName: 'SUBSPACES_2',
      description: 'The right column on the Subspaces page.',
    },
    {
      displayName: 'KNOWLEDGE',
      description: 'The knowledge page.',
    },
  ];

  subspaceCalloutGroups: CalloutGroup[] = [
    {
      displayName: 'HOME_1',
      description: 'The left column on the Home page.',
    },
    {
      displayName: 'HOME_2',
      description: 'The right column on the Home page.',
    },
    {
      displayName: 'CONTRIBUTE_1',
      description: 'The left column on the Contribute page.',
    },
    {
      displayName: 'CONTRIBUTE_2',
      description: 'The right column on the Contribute page.',
    },
    {
      displayName: 'SUBSPACES_1',
      description: 'The left column on the Subspaces page.',
    },
    {
      displayName: 'SUBSPACES_2',
      description: 'The right column on the Subspaces page.',
    },
  ];

  private convertGroupsToText(groups: CalloutGroup[]) {
    return `${escapeString(replaceSpecialCharacters(JSON.stringify(groups)))}`;
  }
}

export type CalloutGroup = {
  displayName: string;
  description: string;
};
