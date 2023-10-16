import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class calloutContributions1696690378816 implements MigrationInterface {
  name = 'calloutContributions1696690378816';
  FIELD_POST_ID = 'postId';
  FIELD_WHITEBOARD_ID = 'whiteboardId';
  FIELD_LINK_ID = 'linkId';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints
    // Post ==> Callout
    await queryRunner.query(
      `ALTER TABLE \`post\` DROP FOREIGN KEY \`FK_deceb07e75a8600e38d5de14a89\``
    );
    // Whiteboard ==> Callout
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP FOREIGN KEY \`FK_fcabc1f3aa38aca70df4f66e938\``
    );

    // Create new data structure
    await queryRunner.query(`CREATE TABLE \`callout_contribution\` (
                                              \`id\` char(36) NOT NULL,
                                              \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                              \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                              \`version\` int NOT NULL,
                                              \`createdBy\` char(36) NULL,
                                              \`authorizationId\` char(36) NULL,
                                              \`whiteboardId\` char(36) NULL,
                                              \`postId\` char(36) NULL,
                                              \`linkId\` char(36) NULL,
                                              \`calloutId\` char(36) NULL,
                                              UNIQUE INDEX \`REL_dfa86c46f509a61c6510536cd9\` (\`authorizationId\`),
                                              UNIQUE INDEX \`REL_5e34f9a356f6254b8da24f8947\` (\`whiteboardId\`),
                                              UNIQUE INDEX \`REL_97fefc97fb254c30577696e1c0\` (\`postId\`),
                                              UNIQUE INDEX \`REL_bdf2d0eced5c95968a85caaaae\` (\`linkId\`),
                                              PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    // Migrate data
    const callouts: {
      id: string;
      type: string;
      framingId: string;
    }[] = await queryRunner.query(`SELECT id, type, framingId from callout`);
    for (const callout of callouts) {
      switch (callout.type) {
        case CalloutType.POST_COLLECTION:
          const posts: {
            id: string;
          }[] = await queryRunner.query(
            `SELECT id from post WHERE calloutId = '${callout.id}'`
          );
          for (const post of posts) {
            await this.createContribution(
              queryRunner,
              callout.id,
              this.FIELD_POST_ID,
              post.id
            );
          }
          break;
        case CalloutType.WHITEBOARD_COLLECTION:
          const whiteboards: {
            id: string;
          }[] = await queryRunner.query(
            `SELECT id from whiteboard WHERE calloutId = '${callout.id}'`
          );
          for (const whiteboard of whiteboards) {
            await this.createContribution(
              queryRunner,
              callout.id,
              this.FIELD_WHITEBOARD_ID,
              whiteboard.id
            );
          }
          break;
        case CalloutType.LINK_COLLECTION:
          const [framing]: { id: string; profileId: string }[] =
            await queryRunner.query(
              `SELECT id FROM callout_framing WHERE id = '${callout.framingId}'`
            );
          const links: {
            id: string;
          }[] = await queryRunner.query(
            `SELECT id from reference WHERE profileId = '${framing.profileId}'`
          );
          for (const link of links) {
            await this.createContribution(
              queryRunner,
              callout.id,
              this.FIELD_LINK_ID,
              link.id
            );
            // Need to explicitly set the value to NULL as column is not deleted
            await queryRunner.query(
              `UPDATE reference SET profileId = NULL WHERE id = '${link.id}'`
            );
          }
          break;
      }
    }

    // Add new constraints
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_dfa86c46f509a61c6510536cd9a\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_5e34f9a356f6254b8da24f8947b\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_97fefc97fb254c30577696e1c0a\` FOREIGN KEY (\`postId\`) REFERENCES \`post\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_bdf2d0eced5c95968a85caaaaee\` FOREIGN KEY (\`linkId\`) REFERENCES \`reference\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` ADD CONSTRAINT \`FK_7370de8eb79ed00b0d403f2299a\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Drop old data structures
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` DROP COLUMN \`calloutId\``
    );
    await queryRunner.query(`ALTER TABLE \`post\` DROP COLUMN \`calloutId\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_7370de8eb79ed00b0d403f2299a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_bdf2d0eced5c95968a85caaaaee\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_97fefc97fb254c30577696e1c0a\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_5e34f9a356f6254b8da24f8947b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_contribution\` DROP FOREIGN KEY \`FK_dfa86c46f509a61c6510536cd9a\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bdf2d0eced5c95968a85caaaae\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_97fefc97fb254c30577696e1c0\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_5e34f9a356f6254b8da24f8947\` ON \`callout_contribution\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_dfa86c46f509a61c6510536cd9\` ON \`callout_contribution\``
    );

    // Create new data structure
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD \`calloutId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD \`calloutId\` char(36) NULL`
    );

    // Migrate data
    // TODO?

    // Add new constraints
    await queryRunner.query(
      `ALTER TABLE \`post\` ADD CONSTRAINT \`FK_deceb07e75a8600e38d5de14a89\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`whiteboard\` ADD CONSTRAINT \`FK_fcabc1f3aa38aca70df4f66e938\` FOREIGN KEY (\`calloutId\`) REFERENCES \`callout\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Drop old data structures

    await queryRunner.query(`DROP TABLE \`callout_contribution\``);
  }

  private async createContribution(
    queryRunner: QueryRunner,
    calloutId: string,
    fieldName: string,
    fieldValue: string
  ) {
    const contributionID = randomUUID();
    const contributionAuthID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
              ('${contributionAuthID}',
              1, '', '', 0, '')`
    );
    await queryRunner.query(
      `INSERT INTO callout_contribution (id, version, authorizationId, calloutId, ${fieldName})
                    VALUES ('${contributionID}',
                            '1',
                            '${contributionAuthID}',
                            '${calloutId}',
                            '${fieldValue}')`
    );
    return contributionID;
  }
}

enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-real-time',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}
