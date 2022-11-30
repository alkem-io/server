import { MigrationInterface, QueryRunner } from 'typeorm';

export class sleeper1669818916467 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting the migration, jk');
    await new Promise<void>(res => {
      setTimeout(() => res(), 20000);
    });
    console.log('Migration successful');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
