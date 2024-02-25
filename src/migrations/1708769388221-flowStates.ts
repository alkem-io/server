import { MigrationInterface, QueryRunner } from 'typeorm';

export class flowStates1708769388221 implements MigrationInterface {
  name = 'flowStates1708769388221';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // create new schema entries
    await queryRunner.query(
      `ALTER TABLE \`innovation_flow\` ADD \`states\` text NOT NULL`
    );

    // disable old constraints

    // migrate data to new setup

    // remove old data
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
