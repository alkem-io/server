import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTagset1691388534530 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE tagset
        SET tags = 'CONTRIBUTE_2'
        WHERE type = 'select-one'
        AND name = 'callout-display-location'
        AND tags = 'KNOWLEDGE'
        AND profileId IN (
            SELECT profile.id FROM profile
            JOIN callout ON profile.id = callout.profileId
            JOIN challenge ON callout.collaborationId = challenge.collaborationId
        );
    `);
    await queryRunner.query(`UPDATE tagset
        SET tags = 'CONTRIBUTE_2'
        WHERE type = 'select-one'
        AND name = 'callout-display-location'
        AND tags = 'KNOWLEDGE'
        AND profileId IN (
            SELECT profile.id FROM profile
            JOIN callout ON profile.id = callout.profileId
            JOIN opportunity ON callout.collaborationId = opportunity.collaborationId
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn(
      "Migration 'updateTagset1691388534530' is not revertible. Please make sure you have a backup of your data before running this migration."
    );
  }
}
