import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const contextVisuals = [
  {
    name: 'banner',
    minWidth: 384,
    maxWidth: 768,
    minHeight: 32,
    maxHeight: 128,
    aspectRatio: 6,
  },
  {
    name: 'bannerNarrow',
    minWidth: 192,
    maxWidth: 384,
    minHeight: 32,
    maxHeight: 128,
    aspectRatio: 3,
  },
  {
    name: 'avatar',
    minWidth: 190,
    maxWidth: 400,
    minHeight: 190,
    maxHeight: 400,
    aspectRatio: 1,
  },
];

export class visual1642233654294 implements MigrationInterface {
  name = 'visual1642233654294';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`visual2\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`uri\` text NOT NULL, \`minWidth\` int NOT NULL, \`maxWidth\` int NOT NULL, \`minHeight\` int NOT NULL, \`maxHeight\` int NOT NULL, \`aspectRatio\` int NOT NULL, \`allowedTypes\` text NOT NULL, \`authorizationId\` char(36) NULL, \`contextId\` char(36) NULL, UNIQUE INDEX \`REL_439d0b187986492b58178a82c3\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual2\` ADD CONSTRAINT \`FK_439d0b187986492b58178a82c3f\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`visual2\` ADD CONSTRAINT \`FK_63de1450cf75dc486700ca034c6\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // select contexts
    const contexts: any[] = await queryRunner.query(
      `SELECT id, visualId from context`
    );
    for (const context of contexts) {
      console.log(`Retrieved context with id: ${context.id}`);
      const [oldVisual] = await queryRunner.query(
        `SELECT id, banner, background, avatar FROM visual
             where id = '${context.visualId}'
             limit 1`
      );
      console.log(`==> Old visual retrieved with  id: ${oldVisual.id}`);
      for (const contextVisual of contextVisuals) {
        const visualID = randomUUID();
        const authID = randomUUID();
        let oldUri = 'not retrieved';
        if (contextVisual.name === 'banner') {
          oldUri = oldVisual.banner;
        } else if (contextVisual.name === 'bannerNarrow') {
          oldUri = oldVisual.background;
        } else if (contextVisual.name === 'avatar') {
          oldUri = oldVisual.avatar;
        }
        await queryRunner.query(
          //console.log(
          `insert into authorization_policy
          values ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
        );

        await queryRunner.query(
          //console.log(
          `INSERT INTO visual2 (id, version, contextId, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
            values ('${visualID}', 1, '${context.id}', '${authID}', '${contextVisual.name}', '${oldUri}', '${contextVisual.minWidth}', '${contextVisual.maxWidth}', '${contextVisual.minHeight}', '${contextVisual.maxHeight}', '${contextVisual.aspectRatio}', '${allowedTypes}')`
        );
      }
    }
    await queryRunner.query(
      `ALTER TABLE \`context\` DROP FOREIGN KEY \`FK_9dd986ff532f7e2447ffe4934d2\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_9dd986ff532f7e2447ffe4934d\` ON \`context\``
    );
    await queryRunner.query(`ALTER TABLE \`context\` DROP COLUMN \`visualId\``);
    await queryRunner.query('DROP TABLE `visual`');
    // rename the table from visual2 to visual
    await queryRunner.query('ALTER TABLE `visual2` RENAME TO  `visual` ');

    // Profile avatars
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD \`avatarId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD UNIQUE INDEX \`IDX_65588ca8ac212b8357637794d6\` (\`avatarId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_65588ca8ac212b8357637794d6f\` FOREIGN KEY (\`avatarId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    const profiles: any[] = await queryRunner.query(
      `SELECT id, avatar from profile`
    );
    for (const profile of profiles) {
      console.log(`Retrieved profile with id: ${profile.id}`);
      const visualID = randomUUID();
      const authID = randomUUID();
      await queryRunner.query(
        //console.log(
        `insert into authorization_policy
          values ('${authID}', NOW(), NOW(), 1, '', '', 0, '')`
      );

      await queryRunner.query(
        //console.log(
        `INSERT INTO visual (id, version, authorizationId, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes)
            values ('${visualID}', 1, '${authID}', 'avatar', '${profile.avatar}', '190', '410', '190', '410', '1', '${allowedTypes}')`
      );
      await queryRunner.query(
        `update profile set avatarId = '${visualID}' WHERE (id = '${profile.id}')`
      );
    }
    await queryRunner.query(`ALTER TABLE \`profile\` DROP COLUMN \`avatar\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_63de1450cf75dc486700ca034c6\``
    );
    await queryRunner.query(
      `ALTER TABLE \`visual\` DROP FOREIGN KEY \`FK_439d0b187986492b58178a82c3f\``
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD \`visualId\` varchar(36) NULL`
    );
    await queryRunner.query(
      `DROP INDEX \`REL_439d0b187986492b58178a82c3\` ON \`visual\``
    );
    await queryRunner.query(`DROP TABLE \`visual\``);
    await queryRunner.query(`ALTER TABLE \`profile\` ADD \`avatar\` text NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_9dd986ff532f7e2447ffe4934d\` ON \`context\` (\`visualId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`context\` ADD CONSTRAINT \`FK_9dd986ff532f7e2447ffe4934d2\` FOREIGN KEY (\`visualId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }
}
