import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInnovationFlowFK1726216394652 implements MigrationInterface {
  name = 'FixInnovationFlowFK1726216394652';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` DROP FOREIGN KEY `FK_96a8cbe1706f459fd7d883be9bd`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_96a8cbe1706f459fd7d883be9bd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` DROP FOREIGN KEY `FK_96a8cbe1706f459fd7d883be9bd`'
    );
    await queryRunner.query(
      'ALTER TABLE `innovation_flow` ADD CONSTRAINT `FK_96a8cbe1706f459fd7d883be9bd` FOREIGN KEY (`profileId`) REFERENCES `profile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION'
    );
  }
}
