import { MigrationInterface, QueryRunner } from 'typeorm';

export class subspaces1711092635967 implements MigrationInterface {
  name = 'subspaces1711092635967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the type for all credentials
    // Update all community policies to remove the host
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
