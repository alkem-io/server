import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import replaceSpecialCharacters from 'replace-special-characters';
import { escapeString } from './utils/escape-string';

enum CalloutType {
  POST = 'post',
  POST_COLLECTION = 'post-collection',
  WHITEBOARD = 'whiteboard',
  WHITEBOARD_RT = 'whiteboard-real-time',
  WHITEBOARD_COLLECTION = 'whiteboard-collection',
  LINK_COLLECTION = 'link-collection',
}

const WhiteboardCheckoutLifecycleConfig = {
  id: 'whiteboard-checkout',
  context: {
    parentID: '',
  },
  initial: 'available',
  states: {
    available: {
      entry: ['availableEntry'],
      on: {
        CHECKOUT: {
          cond: 'WhiteboardCheckoutAuthorized',
          target: 'checkedOut',
          actions: ['lockedTransition', 'checkout'],
        },
      },
      exit: ['availableExit'],
    },
    checkedOut: {
      entry: ['lockedEntry'],
      on: {
        CHECKIN: {
          cond: 'WhiteboardCheckinAuthorized',
          target: 'available',
          actions: ['availableTransition', 'checkin'],
        },
      },
      exit: ['lockedExit'],
    },
  },
};

const NAMEID_LENGTH = 25;

const createNameID = (base: string, useRandomSuffix = true): string => {
  const NAMEID_SUFFIX_LENGTH = 5;
  const nameIDExcludedCharacters = /[^a-zA-Z0-9-]/g;
  let randomSuffix = '';
  if (useRandomSuffix) {
    const randomNumber = Math.floor(
      Math.random() * Math.pow(10, NAMEID_SUFFIX_LENGTH - 1)
    ).toString();
    randomSuffix = `-${randomNumber}`;
  }
  const baseMaxLength = base.slice(0, NAMEID_LENGTH - NAMEID_SUFFIX_LENGTH);
  // replace spaces + trim to NAMEID_LENGTH characters
  const nameID = `${baseMaxLength}${randomSuffix}`.replace(/\s/g, '');
  // replace characters with umlouts etc to normal characters
  const nameIDNoSpecialCharacters: string = replaceSpecialCharacters(nameID);
  // Remove any characters that are not allowed
  return nameIDNoSpecialCharacters
    .replace(nameIDExcludedCharacters, '')
    .toLowerCase()
    .slice(0, NAMEID_LENGTH);
};
export class calloutFramingUpdate1696512891039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the FKs before starting changes
    // Callout ==> Profile
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_19991450cf75dc486700ca034c6\``
    );
    // Callout ==> WhiteboardRt
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_c7c005697d999f2b836052f4967\``
    );

    // Add in the structure
    await queryRunner.query(
      `ALTER TABLE callout_framing ADD whiteboardId char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE callout_framing ADD whiteboardRtId char(36) NULL`
    );
    await queryRunner.query(`ALTER TABLE callout ADD framingId char(36) NULL`);

    const callouts: {
      id: string;
      type: CalloutType;
      profileId: string;
      whiteboardRtId: string;
    }[] = await queryRunner.query(
      `SELECT id, type, profileId, whiteboardRtId from callout`
    );
    for (const callout of callouts) {
      // Create and link the Framing
      const calloutFramingID = randomUUID();
      const calloutFramingAuthID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
              ('${calloutFramingAuthID}',
              1, '', '', 0, '')`
      );

      await queryRunner.query(
        `INSERT INTO callout_framing (id, version, authorizationId, profileId, whiteboardId, whiteboardRtId)
                    VALUES ('${calloutFramingID}',
                            '1',
                            '${calloutFramingAuthID}',
                            '${callout.profileId}',
                            NULL,
                            NULL)`
      );
      await queryRunner.query(
        `UPDATE callout SET framingId = '${calloutFramingID}' WHERE id = '${callout.id}'`
      );

      // Move over the fields
      switch (callout.type) {
        case CalloutType.WHITEBOARD:
          const [whiteboard]: { id: string }[] = await queryRunner.query(
            `SELECT id FROM whiteboard WHERE calloutId = '${callout.id}'`
          );

          if (!whiteboard) {
            console.log(
              `Whiteboard for calloutId ${callout.id} could not be found!`
            );
            break;
          }

          await queryRunner.query(
            `UPDATE callout_framing SET whiteboardId = '${whiteboard.id}' WHERE id = '${calloutFramingID}'`
          );
          await queryRunner.query(
            `UPDATE whiteboard SET calloutId = NULL WHERE id = '${whiteboard.id}'`
          );
          break;
        case CalloutType.WHITEBOARD_RT:
          await queryRunner.query(
            `UPDATE callout_framing SET whiteboardRtId = '${callout.whiteboardRtId}' WHERE id = '${calloutFramingID}'`
          );
          break;
      }
    }

    const calloutTemplates: {
      id: string;
      framingId: string;
      profileId: string;
    }[] = await queryRunner.query(
      `SELECT id, framingId, profileId from callout_template`
    );
    for (const calloutTemplate of calloutTemplates) {
      const whiteboardID = randomUUID();
      const whiteboardAuthID = randomUUID();
      const whiteboardCheckoutID = randomUUID();
      const whiteboardCheckoutAuthID = randomUUID();
      const whiteboardProfileId = randomUUID();
      const whiteboardProfileAuthId = randomUUID();
      const whiteboardProfileLocationId = randomUUID();
      const whiteboardLifecycleId = randomUUID();

      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES ('${whiteboardAuthID}', 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES ('${whiteboardCheckoutAuthID}', 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules)
                VALUES ('${whiteboardProfileAuthId}', 1, '', '', 0, '')`
      );

      const [calloutFraming]: {
        id: string;
        content: string;
        profileId: string;
      }[] = await queryRunner.query(
        `SELECT id, content, profileId FROM callout_framing WHERE id = '${calloutTemplate.framingId}'`
      );

      const [calloutTemplateProfile]: { displayName: string }[] =
        await queryRunner.query(
          `SELECT displayName FROM profile WHERE id = '${calloutTemplate.profileId}'`
        );

      await queryRunner.query(
        `INSERT INTO location VALUES ('${whiteboardProfileLocationId}', DEFAULT, DEFAULT, 1, '', '', DEFAULT ,DEFAULT, DEFAULT, DEFAULT)`
      );
      await queryRunner.query(
        `INSERT INTO profile (id, version, authorizationId, locationId, description, displayName)
                VALUES ('${whiteboardProfileId}',
                        '1',
                        '${whiteboardProfileAuthId}',
                        '${whiteboardProfileLocationId}',
                        '',
                        '')`
      );

      const lifecycleDefinition = { ...WhiteboardCheckoutLifecycleConfig };
      lifecycleDefinition.context.parentID = whiteboardCheckoutID;
      const machineDef = JSON.stringify(lifecycleDefinition);
      const escapedDefinition = escapeString(machineDef);
      await queryRunner.query(
        `INSERT INTO lifecycle (id, version, machineState, machineDef)
                VALUES ('${whiteboardLifecycleId}',
                        '1',
                        NULL,
                        '${escapedDefinition}')`
      );

      await queryRunner.query(
        `INSERT INTO whiteboard_checkout (id, version, whiteboardId, lockedBy, authorizationId, lifecycleId)
                VALUES ('${whiteboardCheckoutID}',
                        '1',
                        '${whiteboardID}',
                        '',
                        '${whiteboardCheckoutAuthID}',
                        '${whiteboardLifecycleId}')`
      );

      const whiteboardNameID = createNameID(calloutTemplateProfile.displayName);

      await queryRunner.query(
        `INSERT INTO whiteboard (id, version, content, authorizationId, checkoutId, nameID, calloutId, createdBy, profileId) VALUES
                ('${whiteboardID}',
                1,
                '${calloutFraming.content}',
                '${whiteboardAuthID}',
                '${whiteboardCheckoutID}',
                '${whiteboardNameID}',
                NULL,
                NULL,
                '${whiteboardProfileId}')`
      );

      await queryRunner.query(
        `UPDATE callout_framing SET whiteboardId = '${whiteboardID}' WHERE id = '${calloutTemplate.framingId}'`
      );
    }

    // Remove the old data structure
    await queryRunner.query(`ALTER TABLE callout DROP COLUMN profileId`);
    await queryRunner.query(`ALTER TABLE callout DROP COLUMN whiteboardRtId`);
    await queryRunner.query(`ALTER TABLE callout_framing DROP COLUMN content`);

    // Add back in the constraints
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD INDEX \`IDX_8bc0e1f40be5816d3a593cbf7f\` (\`whiteboardId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD INDEX \`IDX_62712f63939a6d56fd5c334ee3\` (\`whiteboardRtId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_8bc0e1f40be5816d3a593cbf7fa\` FOREIGN KEY (\`whiteboardId\`) REFERENCES \`whiteboard\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` ADD CONSTRAINT \`FK_62712f63939a6d56fd5c334ee3f\` FOREIGN KEY (\`whiteboardRtId\`) REFERENCES \`whiteboard_rt\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the constraints
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_8bc0e1f40be5816d3a593cbf7fa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP FOREIGN KEY \`FK_62712f63939a6d56fd5c334ee3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_8bc0e1f40be5816d3a593cbf7f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`callout_framing\` DROP INDEX \`IDX_62712f63939a6d56fd5c334ee3\``
    );

    // Add back in framing content
    await queryRunner.query(
      `ALTER TABLE callout_framing ADD content longtext NULL`
    );
    await queryRunner.query(`ALTER TABLE callout ADD profileId char(36) NULL`);
    await queryRunner.query(
      `ALTER TABLE callout ADD whiteboardRtId char(36) NULL`
    );

    // Migrate the data
    const callouts: {
      id: string;
      type: CalloutType;
      framingId: string;
    }[] = await queryRunner.query(`SELECT id, type, framingId from callout`);
    for (const callout of callouts) {
      const [framing]: {
        id: string;
        profileId: string;
        whiteboardId: string;
        whiteboardRtId: string;
      }[] = await queryRunner.query(
        `SELECT id, profileId, whiteboardId, whiteboardRtId from callout_framing`
      );
      await queryRunner.query(
        `UPDATE callout SET profileId = '${framing.profileId}' WHERE id = '${callout.id}'`
      );

      // Move over the fields
      switch (callout.type) {
        case CalloutType.WHITEBOARD:
          await queryRunner.query(
            `UPDATE whiteboard SET calloutId = '${callout.id}' WHERE id = '${framing.whiteboardId}'`
          );
          break;
        case CalloutType.WHITEBOARD_RT:
          await queryRunner.query(
            `UPDATE callout SET whiteboardRtId = '${framing.whiteboardRtId}' WHERE id = '${callout.id}'`
          );
          break;
      }
    }

    // Update the structure
    await queryRunner.query(
      `ALTER TABLE callout_framing DROP COLUMN whiteboardId`
    );
    await queryRunner.query(
      `ALTER TABLE callout_framing DROP COLUMN  whiteboardRtId`
    );
    await queryRunner.query(`ALTER TABLE callout DROP COLUMN framingId`);

    // Add back in the constraints
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_19991450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      'ALTER TABLE `callout` ADD CONSTRAINT `FK_c7c005697d999f2b836052f4967` FOREIGN KEY (`whiteboardRtId`) REFERENCES `whiteboard_rt`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }
}
