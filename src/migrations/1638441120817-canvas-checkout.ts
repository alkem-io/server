import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class canvasCheckout21638441120817 implements MigrationInterface {
  name = 'canvasCheckout21638441120817';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`canvas_checkout\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`canvasID\` varchar(36) NOT NULL, \`lockedBy\` varchar(36) NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'available', \`authorizationId\` char(36) NULL, \`lifecycleId\` char(36) NULL, UNIQUE INDEX \`REL_353b042af56f01ce222f08abf4\` (\`authorizationId\`), UNIQUE INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` (\`lifecycleId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`authorizationId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD UNIQUE INDEX \`IDX_1dc9521a013c92854e92e09933\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`contextId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`checkoutId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD \`isTemplate\` tinyint NOT NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD UNIQUE INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\` (\`checkoutId\`)`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`canvas\` (\`authorizationId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\` (\`checkoutId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_353b042af56f01ce222f08abf49\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` ADD CONSTRAINT \`FK_bd3c7c6c2dbc2a8daf4b1500a69\` FOREIGN KEY (\`lifecycleId\`) REFERENCES \`lifecycle\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_1dc9521a013c92854e92e099335\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_09b225228f9d675758232a43441\` FOREIGN KEY (\`contextId\`) REFERENCES \`context\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` ADD CONSTRAINT \`FK_08d1ccc94b008dbda894a3cfa20\` FOREIGN KEY (\`checkoutId\`) REFERENCES \`canvas_checkout\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Todo: update existing Canvas with a canvas_checkout
    const canvases: any[] = await queryRunner.query(`SELECT id from canvas`);
    for (const canvas of canvases) {
      // create auth policy
      const authId = randomUUID();
      await queryRunner.query(
        `insert into authorization_policy
            values ('${authId}', NOW(), NOW(), 1, '', '', 0)`
      );
      // insert into existing canvas entities
      await queryRunner.query(
        `update canvas set authorizationId = '${authId}' WHERE (id = '${canvas.id}')`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_08d1ccc94b008dbda894a3cfa20\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_09b225228f9d675758232a43441\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP FOREIGN KEY \`FK_1dc9521a013c92854e92e099335\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_bd3c7c6c2dbc2a8daf4b1500a69\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas_checkout\` DROP FOREIGN KEY \`FK_353b042af56f01ce222f08abf49\``
    );

    await queryRunner.query(
      `DROP INDEX \`REL_08d1ccc94b008dbda894a3cfa2\` ON \`canvas\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_1dc9521a013c92854e92e09933\` ON \`canvas\``
    );

    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP INDEX \`IDX_08d1ccc94b008dbda894a3cfa2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`checkoutId\``
    );
    await queryRunner.query(`ALTER TABLE \`canvas\` DROP COLUMN \`contextId\``);
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`isTemplate\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP INDEX \`IDX_1dc9521a013c92854e92e09933\``
    );
    await queryRunner.query(
      `ALTER TABLE \`canvas\` DROP COLUMN \`authorizationId\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_bd3c7c6c2dbc2a8daf4b1500a6\` ON \`canvas_checkout\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_353b042af56f01ce222f08abf4\` ON \`canvas_checkout\``
    );
    await queryRunner.query(`DROP TABLE \`canvas_checkout\``);
  }
}
