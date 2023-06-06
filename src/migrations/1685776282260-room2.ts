import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { escapeString } from './utils/escape-string';

export class room21685776282260 implements MigrationInterface {
  name = 'room21685776282260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the discussion table to add in link to Room
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`commentsId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_345655450cf75dc486700ca034c6\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Process the discussions
    const discussions: {
      id: string;
      communicationId: string;
      communicationRoomID: string;
      commentsCount: number;
      displayName: string;
    }[] = await queryRunner.query(
      `SELECT id, communicationId, communicationRoomID, commentsCount, displayName FROM discussion`
    );

    for (const discussion of discussions) {
      const newRoomID = randomUUID();
      const roomAuthID = randomUUID();

      const roomType = await this.getRoomTypeForDiscussion(
        queryRunner,
        discussion.communicationId
      );

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${roomAuthID}',
        1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO room (id, version, authorizationId, messagesCount, externalRoomID, type, displayName)
            VALUES ('${newRoomID}',
                    '1',
                    '${roomAuthID}',
                    '${discussion.commentsCount}',
                    '${escapeString(discussion.communicationRoomID)}',
                    '${roomType}',
                    '${escapeString(discussion.displayName)}')`
      );

      await queryRunner.query(
        `UPDATE \`discussion\` SET commentsId = '${newRoomID}' WHERE (id = '${discussion.id}')`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`communicationRoomID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`commentsCount\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`displayName\``
    );

    // Process the updates
    // updates ==> authorization
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e087\``
    );
    // communication -> updates
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_777750fa78a37776ad962cb7643\``
    );
    const updates: {
      id: string;
      communicationRoomID: string;
      displayName: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, communicationRoomID, displayName, authorizationId FROM updates`
    );
    for (const update of updates) {
      await queryRunner.query(
        `INSERT INTO room (id, version, authorizationId, messagesCount, externalRoomID, displayName, type)
            VALUES ('${update.id}',
                    '1',
                    '${update.authorizationId}',
                    '0',
                    '${escapeString(update.communicationRoomID)}',
                    '${escapeString(update.displayName)}',
                    'updates')`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query('DROP TABLE `updates`');
  }

  private async getRoomTypeForDiscussion(
    queryRunner: QueryRunner,
    communicationId: string
  ): Promise<string> {
    const communications: {
      id: string;
      hubID: string;
    }[] = await queryRunner.query(
      `SELECT id, hubID FROM communication WHERE (id = '${communicationId}')`
    );
    const communication = communications[0];
    if (communication.hubID === 'platform') {
      return 'discussion_forum';
    }
    return 'discussion';
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Updates

    // communication -> room
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_777750fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `CREATE TABLE \`updates\` (\`id\` char(36) NOT NULL,
                     \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                     \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                      \`version\` int NOT NULL,
                      \`authorizationId\` char(36) NULL,
                      \`displayName\` varchar(255) NULL,
                      \`communicationRoomID\` varchar(128) NULL,
                      PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );

    const updates: {
      id: string;
      externalRoomID: string;
      displayName: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, externalRoomId, displayName, authorizationId FROM room WHERE (type = 'updates')`
    );
    for (const update of updates) {
      await queryRunner.query(
        `INSERT INTO updates (id, version, authorizationId, communicationRoomID, displayName)
            VALUES ('${update.id}',
                    '1',
                    '${update.authorizationId}',
                    '${escapeString(update.externalRoomID)}',
                    '${escapeString(update.displayName)}')`
      );
      await queryRunner.query(`DELETE FROM room WHERE  (id = '${update.id}')`);
    }
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`updates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    ///////////////////////////////////////////////
    // Discussions

    // discussion ==> room
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_345655450cf75dc486700ca034c6\``
    );
    // Update the discussion table to add in the room fields
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`communicationRoomID\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`commentsCount\` int(11) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD \`displayName\` varchar(255) NULL`
    );

    const discussions: {
      id: string;
      commentsId: string;
    }[] = await queryRunner.query(`SELECT id, commentsId FROM discussion`);
    for (const discussion of discussions) {
      const rooms: {
        id: string;
        externalRoomID: string;
        displayName: string;
        authorizationId: string;
        messagesCount: number;
      }[] = await queryRunner.query(
        `SELECT id, externalRoomId, displayName, authorizationId, messagesCount FROM room WHERE (id = '${discussion.commentsId}')`
      );
      const room = rooms[0];

      await queryRunner.query(
        `UPDATE \`discussion\` SET communicationRoomID = '${room.externalRoomID}', commentsCount='${room.messagesCount} WHERE (id = '${discussion.id}')`
      );
      await queryRunner.query(`DELETE FROM room WHERE  (id = '${room.id}')`);
      await queryRunner.query(
        `DELETE FROM authorization_policy WHERE  (id = '${room.authorizationId}')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP COLUMN \`commentsId\``
    );
  }
}
