import { MigrationInterface, QueryRunner } from 'typeorm';

export class room1685643382237 implements MigrationInterface {
  name = 'room1685643382237';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Aspect ==> comments
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
    );
    // CalendarEvent ==> comments
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` DROP FOREIGN KEY \`FK_157de0ce487e25bb69437e80b13\``
    );
    // Callout ==> comments
    await queryRunner.query(
      `ALTER TABLE \`callout\` DROP FOREIGN KEY \`FK_62ed316cda7b75735b20307b47e\``
    );
    // Comments ==> Authorization
    await queryRunner.query(
      `ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_77775901817dd09d5906537e088\` `
    );

    await queryRunner.query('ALTER TABLE comments RENAME TO room');
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD \`type\` varchar(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` RENAME COLUMN \`communicationRoomID\` TO \`externalRoomID\``
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` RENAME COLUMN \`commentsCount\` TO \`messagesCount\``
    );

    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`calendar_event\` ADD CONSTRAINT \`FK_157de0ce487e25bb69437e80b13\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`callout\` ADD CONSTRAINT \`FK_62ed316cda7b75735b20307b47e\` FOREIGN KEY (\`commentsId\`) REFERENCES \`room\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`room\` ADD CONSTRAINT \`FK_77775901817dd09d5906537e088\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`room\` DROP FOREIGN KEY \`FK_d1d94dd8e0c417b4188a05ccbca\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_d1d94dd8e0c417b4188a05ccbc\` ON \`room\``
    );
    await queryRunner.query(`DROP TABLE \`room\``);
  }
}
