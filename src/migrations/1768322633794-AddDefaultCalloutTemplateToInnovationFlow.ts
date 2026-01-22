import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultCalloutTemplateToInnovationFlow1768322633794
  implements MigrationInterface
{
  name = 'AddDefaultCalloutTemplateToInnovationFlow1768322633794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "innovation_flow_state" ADD "defaultCalloutTemplateId" uuid'
    );
    await queryRunner.query(
      'ALTER TABLE "innovation_flow_state" ADD CONSTRAINT "FK_73ec365c49d64b4fb4ab7e3d44c" FOREIGN KEY ("defaultCalloutTemplateId") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE NO ACTION'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "innovation_flow_state" DROP CONSTRAINT "FK_73ec365c49d64b4fb4ab7e3d44c"'
    );
    await queryRunner.query(
      'ALTER TABLE "innovation_flow_state" DROP COLUMN "defaultCalloutTemplateId"'
    );
  }
}
