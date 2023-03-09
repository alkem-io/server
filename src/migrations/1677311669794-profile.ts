import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class profile1677311669794 implements MigrationInterface {
  name = 'profile1677311669794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`displayName\` varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`tagline\` varchar(255) NULL`
    );

    // Add the multiple visuals to profile
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      'ALTER TABLE \`visual\` ADD UNIQUE INDEX \`IDX_77771450cf75dc486700ca034c6\` (\`profileId\`)'
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` ADD CONSTRAINT \`FK_77771450cf75dc486700ca034c6\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    const profiles: any[] = await queryRunner.query(
      `SELECT id, avatarId from profile`
    );
    for (const profile of profiles) {
      await queryRunner.query(
        `UPDATE visual SET profileId = '${profile.id}' WHERE (id = '${profile.avatarId}')`
      );
    }
    await queryRunner.query(
      'ALTER TABLE `profile` DROP FOREIGN KEY `FK_65588ca8ac212b8357637794d6f`'
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`avatarId\``);

    // Migrate the displayName
    const users: any[] = await queryRunner.query(
      `SELECT id, displayName, profileId from user`
    );
    for (const user of users) {
      await queryRunner.query(
        `UPDATE profile SET displayName = '${escapeString(
          user.displayName
        )}' WHERE (id = '${user.profileId}')`
      );
    }
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`displayName\``);

    // Migrate the displayName
    const organizations: any[] = await queryRunner.query(
      `SELECT id, displayName, profileId from organization`
    );
    for (const organization of organizations) {
      await queryRunner.query(
        `UPDATE profile SET displayName = '${escapeString(
          organization.displayName
        )}' WHERE (id = '${organization.profileId}')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`displayName\``
    );
  }

  ///////////////////////////////
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organization\`ADD \`displayName\` varchar(255) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`user\`ADD \`displayName\` varchar(255) NULL`
    );

    // Migrate the displayName
    const organizations: any[] = await queryRunner.query(
      `SELECT id, profileId from organization`
    );
    for (const organization of organizations) {
      const profiles: any[] = await queryRunner.query(
        `SELECT id, displayName from profile WHERE (id = '${organization.profileId}')`
      );
      const profile = profiles[0];
      await queryRunner.query(
        `UPDATE organization SET displayName = '${escapeString(
          profile.displayName
        )}' WHERE (id = '${organization.id}')`
      );
    }

    // User fields
    const users: any[] = await queryRunner.query(
      `SELECT id, profileId from user`
    );
    for (const user of users) {
      const profiles: any[] = await queryRunner.query(
        `SELECT id, displayName from profile WHERE (id = '${user.profileId}')`
      );
      const profile = profiles[0];
      await queryRunner.query(
        `UPDATE user SET displayName = '${escapeString(
          profile.displayName
        )}' WHERE (id = '${user.id}')`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`profile\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`tagline\``);

    // Move avatar back
    await queryRunner.query(
      `ALTER TABLE \`profile\`ADD \`avatarId\` char(36) NULL`
    );
    await queryRunner.query(
      'ALTER TABLE `visual` DROP FOREIGN KEY `FK_77771450cf75dc486700ca034c6`'
    );
    await queryRunner.query(
      'DROP INDEX `IDX_77771450cf75dc486700ca034c6` ON `visual`'
    );
    const profiles: any[] = await queryRunner.query(`SELECT id from profile`);
    for (const profile of profiles) {
      const visuals: any[] = await queryRunner.query(
        `SELECT id from visual WHERE (profileId = '${profile.id}')`
      );
      const visual = visuals[0];
      await queryRunner.query(
        `UPDATE profile SET avatarId = '${visual.id}' WHERE (id = '${profile.id}')`
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_65588ca8ac212b8357637794d6f\` FOREIGN KEY (\`avatarId\`) REFERENCES \`visual\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      'ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_65588ca8ac212b8357637794d6f\` (`avatarId`)'
    );
    await queryRunner.query(`ALTER TABLE \`visual\` DROP COLUMN \`profileId\``);
  }
}
