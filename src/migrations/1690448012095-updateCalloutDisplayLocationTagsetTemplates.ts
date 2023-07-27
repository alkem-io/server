import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateCalloutDisplayLocationTagsetTemplates1690448012095
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE tagset_template SET name = '${CALLOUT_DISPLAY_LOCATION}' WHERE (name = '${DISPLAY_LOCATION_SPACE}' OR name = '${DISPLAY_LOCATION_CHALLENGE}' OR name = '${DISPLAY_LOCATION_OPPORTUNITY}')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}

const CALLOUT_DISPLAY_LOCATION = 'callout-display-location';
const DISPLAY_LOCATION_SPACE = 'display-location-space';
const DISPLAY_LOCATION_CHALLENGE = 'display-location-challenge';
const DISPLAY_LOCATION_OPPORTUNITY = 'display-location-opportunity';
