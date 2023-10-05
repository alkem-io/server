import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-real-time',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}

export class calloutFramingUpdate1696512891039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE callout_framing ADD whiteboardId char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE callout_framing ADD whiteboardRtId char(36) NOT NULL`
    );

    const callouts: {
      id: string;
      type: CalloutType;
      profileId: string;
      whiteboardRtId: string;
    }[] = await queryRunner.query(
      `SELECT id, type, profileId, whiteboardRtId from callout`
    );
    for (const callout of callouts) {
      const calloutFramingID = randomUUID();
      const calloutFramingAuthID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
              ('${calloutFramingAuthID}',
              1, '', '', 0, '')`
      );

      if (callout.type === CalloutType.WHITEBOARD) {
        const whiteboards: { id: string }[] = await queryRunner.query(
          `SELECT id FROM whiteboard WHERE calloutId = '${callout.id}'`
        );
        await queryRunner.query(
          `INSERT INTO callout_framing (id, version, authorizationId, profileId, whiteboardId, whiteboardRtId)
                      VALUES ('${calloutFramingID}',
                              '1',
                              '${calloutFramingAuthID}',
                              '${callout.profileId}',
                              '${whiteboards[0].id}',
                              'NULL')`
        );
        continue;
      }

      if (callout.type === CalloutType.WHITEBOARD_RT) {
        await queryRunner.query(
          `INSERT INTO callout_framing (id, version, authorizationId, profileId, whiteboardId, whiteboardRtId)
                      VALUES ('${calloutFramingID}',
                              '1',
                              '${calloutFramingAuthID}',
                              '${callout.profileId}',
                              'NULL',
                              '${callout.whiteboardRtId}')`
        );
        continue;
      }

      await queryRunner.query(
        `INSERT INTO callout_framing (id, version, authorizationId, profileId, whiteboardId, whiteboardRtId)
                    VALUES ('${calloutFramingID}',
                            '1',
                            '${calloutFramingAuthID}',
                            '${callout.profileId}',
                            'NULL',
                            'NULL')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_19991450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_c7c005697d999f2b836052f4967\``
    );
    await queryRunner.query(`ALTER TABLE callout DROP COLUMN profileId`);
    await queryRunner.query(`ALTER TABLE callout DROP COLUMN whiteboardRtId`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE callout ADD profileId char(36) NOT NULL`
    );
  }
}
