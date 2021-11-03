import { MigrationInterface, QueryRunner } from 'typeorm';

export class discussion1635271457885 implements MigrationInterface {
  name = 'discussion1635271457885';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // (a) create new entity data model
    await queryRunner.query(
      `CREATE TABLE \`discussion\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`displayName\` varchar(255) NOT NULL, \`title\` text NOT NULL, \`category\` text NOT NULL, \`communicationGroupID\` varchar(255) NOT NULL, \`communicationRoomID\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, \`communicationId\` char(36) NULL, UNIQUE INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`updates\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`displayName\` varchar(255) NOT NULL, \`communicationGroupID\` varchar(255) NOT NULL, \`communicationRoomID\` varchar(255) NOT NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_7777dccdda9ba57d8e3a634cd0\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`communication\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`displayName\` varchar(255) NOT NULL, \`ecoverseID\` varchar(36) NOT NULL, \`communicationGroupID\` varchar(255) NOT NULL, \`updatesId\` char(36) NULL, \`authorizationId\` char(36) NULL, UNIQUE INDEX \`REL_a20c5901817dd09d5906537e08\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`communicationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD UNIQUE INDEX \`IDX_7fbe50fa78a37776ad962cb764\` (\`communicationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_4555dccdda9ba57d8e3a634cd0d\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_c6a084fe80d01c41d9f142d51aa\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_a20c5901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e087\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD CONSTRAINT \`FK_7fbe50fa78a37776ad962cb7643\` FOREIGN KEY (\`communicationId\`) REFERENCES \`communication\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` ADD CONSTRAINT \`FK_777750fa78a37776ad962cb7643\` FOREIGN KEY (\`updatesId\`) REFERENCES \`updates\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // For each Community entity create a new Communication entity and set the communicationID in the Community entity to be the id of the new Communication entity
    // For each Communication entity create an associated Authorization entity and set the ID of the authorization entity in the authorizatinId field. Note: all fields can have default values as the authorization policy can be reset after.
    // For each Community entity copy the following fields from the Community entity to the linked Communication entity: communicationGroupID, updatesRoomID, ecoverseID
    await queryRunner.query(
      `CREATE PROCEDURE sp_update_communications()
      BEGIN
      DECLARE done BOOLEAN DEFAULT FALSE;
      DECLARE community_id varchar(36);
      DECLARE community_communicationGroupID varchar(255);
      DECLARE community_updatesRoomID varchar(255);
      DECLARE community_ecoverseID varchar(255);
      DECLARE community_displayName varchar(255);
      DECLARE community_cursor CURSOR FOR SELECT id, communicationGroupID, updatesRoomID, ecoverseID, displayName FROM community;
      DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

      OPEN community_cursor;

      read_loop: LOOP
        FETCH community_cursor INTO community_id, community_communicationGroupID, community_updatesRoomID, community_ecoverseID, community_displayName;
      IF done THEN
        LEAVE read_loop;
      END IF;

        SELECT community_id, community_communicationGroupID, community_updatesRoomID, community_ecoverseID;
        INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess) SELECT UUID(), 1, '', '', 0;
        INSERT INTO updates(id, version, communicationGroupID, communicationRoomID, authorizationID, displayName)
          VALUES (UUID(), 1, community_communicationGroupID, community_updatesRoomID, (SELECT id from authorization_policy order by createdDate  desc LIMIT 1), community_displayName);
        INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess) SELECT UUID(), 1, '', '', 0;
        INSERT INTO communication(id, version, communicationGroupID, updatesID, ecoverseID, authorizationID, displayName)
          VALUES (UUID(), 1, community_communicationGroupID, (SELECT id from updates order by createdDate  desc LIMIT 1), community_ecoverseID, (SELECT id from authorization_policy order by createdDate  desc LIMIT 1), community_displayName);
        UPDATE community SET communicationId = (SELECT id from communication order by createdDate  desc LIMIT 1) where id = community_id;
      END LOOP;

      CLOSE community_cursor;
    END`
    );
    await queryRunner.query(`CALL sp_update_communications();`);

    // (c) remove old fields from the Community entity
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`communicationGroupID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`discussionRoomID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`updatesRoomID\``
    );
  }

  // Note: down only returns the schema and not the data.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_a20c5901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`communication\` DROP FOREIGN KEY \`FK_777750fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`updates\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e087\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_c6a084fe80d01c41d9f142d51aa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_4555dccdda9ba57d8e3a634cd0d\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP FOREIGN KEY \`FK_7fbe50fa78a37776ad962cb7643\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` DROP COLUMN \`communicationId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`updatesRoomID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`discussionRoomID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`community\` ADD \`communicationGroupID\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_a20c5901817dd09d5906537e08\` ON \`communication\``
    );
    await queryRunner.query(`DROP TABLE \`communication\``);
    await queryRunner.query(
      `DROP INDEX \`REL_4555dccdda9ba57d8e3a634cd0\` ON \`discussion\``
    );
    await queryRunner.query(`DROP TABLE \`discussion\``);
  }
}
