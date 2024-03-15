import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';
import replaceSpecialCharacters from 'replace-special-characters';

export class calloutGroups1710272553085 implements MigrationInterface {
  name = 'calloutGroups1710272553085';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` ADD \`groupsStr\` text NOT NULL DEFAULT ('[]')`
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
    const tagset_templates: {
      id: string;
      name: string;
      allowedValues: string;
    }[] = await queryRunner.query(
      `SELECT id, name, allowedValues FROM tagset_template`
    );
    for (const tagset_template of tagset_templates) {
      if (tagset_template.name === 'callout-display-location') {
        await queryRunner.query(
          `UPDATE tagset_template SET name = 'callout-group' WHERE id = '${tagset_template.id}'`
        );
        if (tagset_template.allowedValues.includes('CHALLENGES_1')) {
          await queryRunner.query(
            `UPDATE tagset_template SET tags = '${tagset_template.allowedValues.replace(
              'CHALLENGES_1',
              'SUBSPACES_1'
            )}' WHERE id = '${tagset_template.id}'`
          );
        }
        if (tagset_template.allowedValues.includes('OPPORTUNITIES_1')) {
          await queryRunner.query(
            `UPDATE tagset_template SET tags = '${tagset_template.allowedValues.replace(
              'OPPORTUNITIES_1',
              'SUBSPACES_1'
            )}' WHERE id = '${tagset_template.id}'`
          );
        }
        if (tagset_template.allowedValues.includes('CHALLENGES_2')) {
          await queryRunner.query(
            `UPDATE tagset_template SET tags = '${tagset_template.allowedValues.replace(
              'CHALLENGES_2',
              'SUBSPACES_2'
            )}' WHERE id = '${tagset_template.id}'`
          );
        }
        if (tagset_template.allowedValues.includes('OPPORTUNITIES_2')) {
          await queryRunner.query(
            `UPDATE tagset_template SET tags = '${tagset_template.allowedValues.replace(
              'OPPORTUNITIES_2',
              'SUBSPACES_2'
            )}' WHERE id = '${tagset_template.id}'`
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`collaboration\` DROP COLUMN \`groupsStr\``
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
      collaborationId: string;
    }[] = await queryRunner.query(
      `SELECT id, collaborationId FROM ${journeyType}`
    );
    for (const journey of journeys) {
      await queryRunner.query(
        `UPDATE ${journeyType} SET type = '${journeyType}' WHERE id = '${journey.id}'`
      );
      const groupsStr = escapeString(
        replaceSpecialCharacters(JSON.stringify(calloutGroups))
      );
      await queryRunner.query(
        `UPDATE collaboration SET groupsStr = '${groupsStr}' WHERE id = '${journey.collaborationId}'`
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
}

export type CalloutGroup = {
  displayName: string;
  description: string;
};
