import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class calloutDefaultTagset1680602777993 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const callouts: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from callout`);
    for (const callout of callouts) {
      const tagsets: { id: string; name: string; profileId: string }[] =
        await queryRunner.query(
          `SELECT id, name, profileId from tagset WHERE (profileId = '${callout.profileId}')`
        );

      let hasDefaultTagset = false;
      for (const tagset of tagsets) {
        if (tagset.name == 'default') hasDefaultTagset = true;
      }

      if (!hasDefaultTagset) {
        const tagsetID = randomUUID();
        const tagsetAuthID = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId, profileId) VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}', '${callout.profileId}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const callouts: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from callout`);
    for (const callout of callouts) {
      const tagsets: {
        id: string;
        authorizationId: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId from tagset WHERE (profileId = '${callout.profileId}' AND name = 'default')`
      );

      for (const tagset of tagsets) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = '${tagset.authorizationId}'`
        );
        await queryRunner.query(`DELETE FROM tagset WHERE id = '${tagset.id}'`);
      }
    }
  }
}
