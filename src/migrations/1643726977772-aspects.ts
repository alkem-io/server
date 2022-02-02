import { MigrationInterface, QueryRunner } from 'typeorm';

export class aspects1643726977772 implements MigrationInterface {
  name = 'aspects1643726977772';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`explanation\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`title\``);
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`framing\``);

    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`createdBy\` varchar(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`type\` char(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`description\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`nameID\` char(36) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`displayName\` char(255) NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`bannerId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD UNIQUE INDEX \`IDX_945b0355b4e9bd6b02c66507a3\` (\`bannerId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`bannerNarrowId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD UNIQUE INDEX \`IDX_7e83c97dc253674f4ce9d32cb0\` (\`bannerNarrowId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`discussionId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD UNIQUE INDEX \`IDX_c4fb636888fc391cf1d7406e89\` (\`discussionId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c52470717008d58ec6d76b12ffa\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_6c57bb50b3b6fb4943c807c83ce\``
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_945b0355b4e9bd6b02c66507a3\` ON \`aspect\` (\`bannerId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_7e83c97dc253674f4ce9d32cb0\` ON \`aspect\` (\`bannerNarrowId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_c4fb636888fc391cf1d7406e89\` ON \`aspect\` (\`discussionId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_945b0355b4e9bd6b02c66507a30\` FOREIGN KEY (\`bannerId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_7e83c97dc253674f4ce9d32cb01\` FOREIGN KEY (\`bannerNarrowId\`) REFERENCES \`visual\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD CONSTRAINT \`FK_c4fb636888fc391cf1d7406e891\` FOREIGN KEY (\`discussionId\`) REFERENCES \`discussion\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD \`aspectId\` char(36) NULL`
    );

    await queryRunner.query(
      `ALTER TABLE \`reference\` ADD CONSTRAINT \`FK_a21a8eda24f18cd6af58b0d4e72\` FOREIGN KEY (\`aspectId\`) REFERENCES \`aspect\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP FOREIGN KEY \`FK_a21a8eda24f18cd6af58b0d4e72\``
    );
    await queryRunner.query(
      `ALTER TABLE \`reference\` DROP COLUMN \`aspectId\``
    );

    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`type\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`description\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`nameID\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`displayName\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_6c57bb50b3b6fb4943c807c83ce\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c4fb636888fc391cf1d7406e891\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_7e83c97dc253674f4ce9d32cb01\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_945b0355b4e9bd6b02c66507a30\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP FOREIGN KEY \`FK_c52470717008d58ec6d76b12ffa\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_c4fb636888fc391cf1d7406e89\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_7e83c97dc253674f4ce9d32cb0\` ON \`aspect\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_945b0355b4e9bd6b02c66507a3\` ON \`aspect\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP INDEX \`IDX_c4fb636888fc391cf1d7406e89\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`discussionId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP INDEX \`IDX_7e83c97dc253674f4ce9d32cb0\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP COLUMN \`bannerNarrowId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` DROP INDEX \`IDX_945b0355b4e9bd6b02c66507a3\``
    );
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`bannerId\``);
    await queryRunner.query(`ALTER TABLE \`aspect\` DROP COLUMN \`createdBy\``);
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`explanation\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`framing\` text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`aspect\` ADD \`title\` text NOT NULL`
    );
  }
}
