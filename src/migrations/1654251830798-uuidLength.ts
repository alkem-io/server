import { MigrationInterface, QueryRunner } from 'typeorm';
import { alterColumnType } from './utils/alterColumnType';

export class uuidLength1654251830798 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // application table
    await alterColumnType(queryRunner, 'application', 'hxbID', 'varchar(36)');

    // challenge
    await alterColumnType(queryRunner, 'challenge', 'hxbID', 'varchar(36)');
    await alterColumnType(queryRunner, 'challenge', 'nameID', 'varchar(36)');

    // community
    await alterColumnType(queryRunner, 'community', 'hxbID', 'varchar(36)');

    // credential
    await alterColumnType(
      queryRunner,
      'credential',
      'resourceID',
      'varchar(36)'
    );

    // hxb
    await alterColumnType(queryRunner, 'hxb', 'nameID', 'varchar(36)');

    // opportunity
    await alterColumnType(queryRunner, 'opportunity', 'hxbID', 'varchar(36)');
    await alterColumnType(queryRunner, 'opportunity', 'nameID', 'varchar(36)');

    // organization
    await alterColumnType(queryRunner, 'organization', 'nameID', 'varchar(36)');

    // organization_verification
    await alterColumnType(
      queryRunner,
      'organization_verification',
      'organizationID',
      'varchar(36)'
    );

    // project
    await alterColumnType(queryRunner, 'project', 'hxbID', 'varchar(36)');
    await alterColumnType(queryRunner, 'project', 'nameID', 'varchar(36)');

    // user
    await alterColumnType(queryRunner, 'user', 'nameID', 'varchar(36)');

    // user_group
    await alterColumnType(queryRunner, 'user_group', 'hxbID', 'varchar(36)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // application table
    await alterColumnType(queryRunner, 'application', 'hxbID', 'varchar(255)');

    // challenge
    await alterColumnType(queryRunner, 'challenge', 'hxbID', 'varchar(255)');
    await alterColumnType(queryRunner, 'challenge', 'nameID', 'varchar(255)');

    // community
    await alterColumnType(queryRunner, 'community', 'hxbID', 'varchar(255)');

    // credential
    await alterColumnType(
      queryRunner,
      'credential',
      'resourceID',
      'varchar(255)'
    );

    // hxb
    await alterColumnType(queryRunner, 'hxb', 'nameID', 'varchar(255)');

    // opportunity
    await alterColumnType(queryRunner, 'opportunity', 'hxbID', 'varchar(255)');
    await alterColumnType(queryRunner, 'opportunity', 'nameID', 'varchar(255)');

    // organization
    await alterColumnType(
      queryRunner,
      'organization',
      'nameID',
      'varchar(255)'
    );

    // organization_verification
    await alterColumnType(
      queryRunner,
      'organization_verification',
      'organizationID',
      'varchar(255)'
    );

    // project
    await alterColumnType(queryRunner, 'project', 'hxbID', 'varchar(255)');
    await alterColumnType(queryRunner, 'project', 'nameID', 'varchar(255)');

    // user
    await alterColumnType(queryRunner, 'user', 'nameID', 'varchar(255)');

    // user_group
    await alterColumnType(queryRunner, 'user_group', 'hxbID', 'varchar(255)');
  }
}
