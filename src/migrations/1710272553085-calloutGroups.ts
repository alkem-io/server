import { MigrationInterface, QueryRunner } from 'typeorm';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

export class calloutGroups1710272553085 implements MigrationInterface {
  name = 'calloutGroups1710272553085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`groups\` text NOT NULL DEFAULT ('[]')`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`type\`  varchar(32) NOT NULL DEFAULT ('space')`
    );
    await queryRunner.query(
      `ALTER TABLE \`challenge\` ADD \`type\`  varchar(32) NOT NULL DEFAULT ('challenge')`
    );
    await queryRunner.query(
      `ALTER TABLE \`opportunity\` ADD \`type\`  varchar(32) NOT NULL DEFAULT ('opportunity')`
    );

    await this.addCalloutGroupsAndType(
      queryRunner,
      'space',
      this.spaceCalloutGroups
    );
    await this.addCalloutGroupsAndType(
      queryRunner,
      'challenge',
      this.subspaceCalloutGroups
    );
    await this.addCalloutGroupsAndType(
      queryRunner,
      'opportunity',
      this.subspaceCalloutGroups
    );

    const tagsets: {
      id: string;
      name: string;
      tags: string;
    }[] = await queryRunner.query(`SELECT id, name, tags FROM tagset`);
    for (const tagset of tagsets) {
      if (tagset.name === 'callout-display-location') {
        await queryRunner.query(
          `UPDATE tagset SET name = 'callout-group' WHERE id = '${tagset.id}'`
        );
        if (tagset.tags.includes('CHALLENGES_1')) {
          await queryRunner.query(
            `UPDATE tagset SET tags = '${tagset.tags.replace(
              'CHALLENGES_1',
              'SUBSPACES_1'
            )}' WHERE id = '${tagset.id}'`
          );
        }
        if (tagset.tags.includes('OPPORTUNITIES_1')) {
          await queryRunner.query(
            `UPDATE tagset SET tags = '${tagset.tags.replace(
              'OPPORTUNITIES_1',
              'SUBSPACES_1'
            )}' WHERE id = '${tagset.id}'`
          );
        }
        if (tagset.tags.includes('CHALLENGES_2')) {
          await queryRunner.query(
            `UPDATE tagset SET tags = '${tagset.tags.replace(
              'CHALLENGES_2',
              'SUBSPACES_2'
            )}' WHERE id = '${tagset.id}'`
          );
        }
        if (tagset.tags.includes('OPPORTUNITIES_2')) {
          await queryRunner.query(
            `UPDATE tagset SET tags = '${tagset.tags.replace(
              'OPPORTUNITIES_2',
              'SUBSPACES_2'
            )}' WHERE id = '${tagset.id}'`
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`groups\``
    );
    await queryRunner.query(`ALTER TABLE \`space\` DROP COLUMN \`type\``);
    await queryRunner.query(`ALTER TABLE \`challenge\` DROP COLUMN \`type\``);
    await queryRunner.query(`ALTER TABLE \`opportunity\` DROP COLUMN \`type\``);
  }

  private async addCalloutGroupsAndType(
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
        )}', type = '${journeyType}' WHERE id = '${journey.id}'`
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
