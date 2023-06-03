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
      communicationRoomID: string;
      commentsCount: number;
    }[] = await queryRunner.query(
      `SELECT id, communicationRoomID, commentsCount FROM discussion`
    );
    for (const discussion of discussions) {
      const newRoomID = randomUUID();
      const roomAuthID = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${roomAuthID}',
        1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO room (id, version, authorizationId, messagesCount, externalRoomID)
            VALUES ('${newRoomID}',
                    '1',
                    '${roomAuthID}',
                    '${discussion.commentsCount}',
                    '${escapeString(discussion.communicationRoomID)}')`
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
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, communicationRoomID, authorizationId FROM updates`
    );
    for (const update of updates) {
      await queryRunner.query(
        `INSERT INTO room (id, version, authorizationId, messagesCount, externalRoomID)
            VALUES ('${update.id}',
                    '1',
                    '${update.authorizationId}',
                    '0',
                    '${escapeString(update.communicationRoomID)}')`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query('DROP TABLE `updates`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
