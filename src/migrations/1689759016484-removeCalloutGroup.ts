import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeCalloutGroup1689759016484 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE tagset SET name = '${CALLOUT_DISPLAY_LOCATION}' WHERE (name = '${DISPLAY_LOCATION_SPACE}' OR name = '${DISPLAY_LOCATION_CHALLENGE}' OR name = '${DISPLAY_LOCATION_OPPORTUNITY}')`
    );

    const callouts: { id: string; profileId: string; group: string }[] =
      await queryRunner.query(`SELECT id, profileId, \`group\` FROM callout`);
    for (const callout of callouts) {
      const tagsets: { id: string; name: string }[] = await queryRunner.query(
        `SELECT id, name FROM tagset WHERE (profileId = '${callout.profileId}' AND name = '${CALLOUT_DISPLAY_LOCATION}')`
      );

      if (tagsets.length > 0 && callout.group in CalloutDisplayLocation) {
        const tagset = tagsets[0];
        await queryRunner.query(`UPDATE tagset SET tags = ? WHERE id = ?`, [
          callout.group,
          tagset.id,
        ]);
      }
    }

    await queryRunner.query(`ALTER TABLE \`callout\` DROP COLUMN \`group\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD \`group\` varchar(32) NULL`
    );
  }
}

const CALLOUT_DISPLAY_LOCATION = 'callout-display-location';
const DISPLAY_LOCATION_SPACE = 'display-location-space';
const DISPLAY_LOCATION_CHALLENGE = 'display-location-challenge';
const DISPLAY_LOCATION_OPPORTUNITY = 'display-location-opportunity';
enum CalloutDisplayLocation {
  HOME_TOP = 'HOME_0',
  HOME_LEFT = 'HOME_1',
  HOME_RIGHT = 'HOME_2',
  CONTRIBUTE_LEFT = 'CONTRIBUTE_1',
  CONTRIBUTE_RIGHT = 'CONTRIBUTE_2',
  KNOWLEDGE = 'KNOWLEDGE',
  COMMUNITY_LEFT = 'COMMUNITY_1',
  COMMUNITY_RIGHT = 'COMMUNITY_2',
  CHALLENGES_LEFT = 'CHALLENGES_1',
  CHALLENGES_RIGHT = 'CHALLENGES_2',
  OPPORTUNITIES_LEFT = 'OPPORTUNITIES_1',
  OPPORTUNITIES_RIGHT = 'OPPORTUNITIES_2',
}
