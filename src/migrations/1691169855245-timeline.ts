import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class timeline1691169855245 implements MigrationInterface {
  name = 'timeline1691169855245';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Space ==> Timeline
    await queryRunner.query(
      'ALTER TABLE `space` DROP FOREIGN KEY `FK_3005ed9ce3f57c250c59d6d5065`'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD `timelineId` char(36) NULL'
    );

    const spaces: {
      id: string;
      timelineId: string;
      collaborationId: string;
    }[] = await queryRunner.query(
      `SELECT id, timelineId, collaborationId FROM space`
    );
    for (const space of spaces) {
      await queryRunner.query(
        `UPDATE collaboration SET timelineId = '${space.timelineId}' WHERE id = '${space.collaborationId}'`
      );
    }

    const challenges: { id: string; collaborationId: string }[] =
      await queryRunner.query(`SELECT id, collaborationId FROM challenge`);
    for (const challenge of challenges) {
      await this.createTimelineOnCollaboration(
        queryRunner,
        challenge.collaborationId
      );
    }

    const opportunities: { id: string; collaborationId: string }[] =
      await queryRunner.query(`SELECT id, collaborationId FROM opportunity`);
    for (const opportunity of opportunities) {
      await this.createTimelineOnCollaboration(
        queryRunner,
        opportunity.collaborationId
      );
    }

    await queryRunner.query(
      'ALTER TABLE `collaboration` ADD CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineId`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query('ALTER TABLE `space` DROP COLUMN `timelineId`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Collaboration ==> Timeline
    await queryRunner.query(
      'ALTER TABLE `collaboration` DROP FOREIGN KEY `FK_3005ed9ce3f57c250c59d6d5065`'
    );
    await queryRunner.query(
      'ALTER TABLE `space` ADD `timelineId` char(36) NULL'
    );

    const spaces: {
      id: string;
      collaborationId: string;
    }[] = await queryRunner.query(`SELECT id, collaborationId FROM space`);
    for (const space of spaces) {
      const collaborations: {
        id: string;
        timelineId: string;
      }[] = await queryRunner.query(
        `SELECT id, timelineId FROM collaboration  WHERE id = '${space.collaborationId}'`
      );
      const collaboration = collaborations[0];
      await queryRunner.query(
        `UPDATE space SET timelineId = '${collaboration.timelineId}' WHERE id = '${space.id}'`
      );
    }

    await queryRunner.query(
      'ALTER TABLE `space` ADD CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineId`) REFERENCES `timeline`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
    await queryRunner.query(
      'ALTER TABLE `collaboration` DROP COLUMN `timelineId`'
    );
  }

  private async createTimelineOnCollaboration(
    queryRunner: QueryRunner,
    collaborationId: string
  ): Promise<string> {
    // create calendar instance with authorization
    const calendarAuthID = randomUUID();
    const calendarID = randomUUID();
    const timelineAuthID = randomUUID();
    const timelineID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${calendarAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO calendar (id, createdDate, updatedDate, version, authorizationId) VALUES ('${calendarID}', NOW(), NOW(), 1, '${calendarAuthID}')`
    );
    await queryRunner.query(
      `INSERT INTO authorization_policy VALUES ('${timelineAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO timeline (id, createdDate, updatedDate, version, authorizationId, calendarId) VALUES ('${timelineID}', NOW(), NOW(), 1, '${timelineAuthID}', '${calendarID}')`
    );
    await queryRunner.query(
      `UPDATE collaboration SET timelineId = '${timelineID}' WHERE id = '${collaborationId}'`
    );
    return timelineID;
  }
}
