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
      this.spaceCalloutGroups
    );
    await this.addCalloutGroups(
      queryRunner,
      'opportunity',
      this.spaceCalloutGroups
    );
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
      displayName: 'prepare',
      description: 'The innovation is being prepared.',
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
