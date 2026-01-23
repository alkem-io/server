import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaGallery1768490929999 implements MigrationInterface {
  name = 'MediaGallery1768490929999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "media_gallery" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "nameID" character varying(36) NOT NULL, "createdBy" uuid, "authorizationId" uuid, "profileId" uuid, CONSTRAINT "REL_e0ee9bf6142bc19e9eff263824" UNIQUE ("authorizationId"), CONSTRAINT "REL_f3d9636c2b8b9d056a1de2cc66" UNIQUE ("profileId"), CONSTRAINT "PK_media_gallery_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`ALTER TABLE "visual" ADD "mediaGalleryId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD "mediaGalleryId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "REL_471fa4cb18d52aafe50e51dfe1" UNIQUE ("mediaGalleryId")`
    );
    await queryRunner.query(
      `ALTER TABLE "media_gallery" ADD CONSTRAINT "FK_e0ee9bf6142bc19e9eff2638245" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "media_gallery" ADD CONSTRAINT "FK_f3d9636c2b8b9d056a1de2cc66c" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" ADD CONSTRAINT "FK_f7d0fd686fb8aec91868c548f62" FOREIGN KEY ("mediaGalleryId") REFERENCES "media_gallery"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_471fa4cb18d52aafe50e51dfe11" FOREIGN KEY ("mediaGalleryId") REFERENCES "media_gallery"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_471fa4cb18d52aafe50e51dfe11"`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" DROP CONSTRAINT "FK_f7d0fd686fb8aec91868c548f62"`
    );
    await queryRunner.query(
      `ALTER TABLE "media_gallery" DROP CONSTRAINT "FK_f3d9636c2b8b9d056a1de2cc66c"`
    );
    await queryRunner.query(
      `ALTER TABLE "media_gallery" DROP CONSTRAINT "FK_e0ee9bf6142bc19e9eff2638245"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "REL_471fa4cb18d52aafe50e51dfe1"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP COLUMN "mediaGalleryId"`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" DROP COLUMN "mediaGalleryId"`
    );
    await queryRunner.query(`DROP TABLE "media_gallery"`);
  }
}
