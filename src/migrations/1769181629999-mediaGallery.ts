import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaGallery1769181629999 implements MigrationInterface {
  name = 'MediaGallery1769181629999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "media_gallery" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdDate" TIMESTAMP NOT NULL DEFAULT now(), "updatedDate" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "createdBy" uuid, "authorizationId" uuid, "storageBucketId" uuid, CONSTRAINT "REL_e0ee9bf6142bc19e9eff263824" UNIQUE ("authorizationId"), CONSTRAINT "UQ_1f98def29bcf7b12442706430f9" UNIQUE ("storageBucketId"), CONSTRAINT "PK_b17b5c7f5529796539b566d6506" PRIMARY KEY ("id"))`);

    await queryRunner.query(`ALTER TABLE "media_gallery" ADD CONSTRAINT "FK_e0ee9bf6142bc19e9eff2638245" FOREIGN KEY ("authorizationId") REFERENCES "authorization_policy"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "media_gallery" ADD CONSTRAINT "FK_1f98def29bcf7b12442706430f9" FOREIGN KEY ("storageBucketId") REFERENCES "storage_bucket"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "visual" ADD "mediaGalleryId" uuid`);

    await queryRunner.query(`ALTER TABLE "visual" ADD CONSTRAINT "FK_f7d0fd686fb8aec91868c548f62" FOREIGN KEY ("mediaGalleryId") REFERENCES "media_gallery"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "callout_framing" ADD "mediaGalleryId" uuid`);

    await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "REL_471fa4cb18d52aafe50e51dfe1" UNIQUE ("mediaGalleryId")`);

    await queryRunner.query(`ALTER TABLE "callout_framing" ADD CONSTRAINT "FK_471fa4cb18d52aafe50e51dfe11" FOREIGN KEY ("mediaGalleryId") REFERENCES "media_gallery"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "callout_framing" DROP CONSTRAINT "FK_471fa4cb18d52aafe50e51dfe11"`
    );
    await queryRunner.query(
      `ALTER TABLE "visual" DROP CONSTRAINT "FK_f7d0fd686fb8aec91868c548f62"`
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
