import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceLibraryDefaults1722870550857 implements MigrationInterface {
  name = 'SpaceLibraryDefaults1722870550857';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`libraryId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_43559aeadc1a5169d17e81b3d4\` (\`libraryId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD \`defaultsId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`space\` ADD UNIQUE INDEX \`IDX_6b1efee39d076d9f7ecb8fef4c\` (\`defaultsId\`)`
    );

    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_9542f2ad51464f961e5b5b5b582\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_bea623a346d2e3f88dd0aeef576\``
    );

    const accounts: {
      id: string;
      spaceId: string;
      defaultsId: string;
      libraryId: string;
    }[] = await queryRunner.query(
      `SELECT id, spaceId, defaultsId, libraryId FROM \`account\``
    );
    for (const account of accounts) {
      await queryRunner.query(
        `UPDATE \`space\` SET defaultsId = '${account.defaultsId}', libraryId = '${account.libraryId}' WHERE id = '${account.spaceId}'`
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_9542f2ad51464f961e5b5b5b582\` FOREIGN KEY (\`defaultsId\`) REFERENCES \`space_defaults\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`space\` ADD CONSTRAINT \`FK_bea623a346d2e3f88dd0aeef576\` FOREIGN KEY (\`libraryId\`) REFERENCES \`templates_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE \`account\` DROP COLUMN \`defaultsId\``
    );
    await queryRunner.query(
      `ALTER TABLE \`account\` DROP COLUMN \`libraryId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
