import { MigrationInterface, QueryRunner } from "typeorm"

export class removeOrphanedAspectTemplates1679583590413 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `DELETE FROM aspect_template where templateInfoId is NULL and authorizationId is NULL and templatesSetId is NULL`
      );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
