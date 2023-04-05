import { VisualType } from '@common/enums/visual.type';
import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

const templateVisual = {
  name: 'bannerNarrow',
  minWidth: 307,
  maxWidth: 410,
  minHeight: 192,
  maxHeight: 256,
  aspectRatio: 1.6,
};

const allowedTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
];

export class calloutDefaultTagset1680602777993 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const callouts: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from callout`);
    for (const callout of callouts) {
      const tagsets: { id: string; name: string; profileId: string }[] =
        await queryRunner.query(
          `SELECT id, name, profileId from tagset WHERE (profileId = '${callout.profileId}')`
        );

      let hasDefaultTagset = false;
      for (const tagset of tagsets) {
        if (tagset.name == 'default') hasDefaultTagset = true;
      }

      if (!hasDefaultTagset) {
        const tagsetID = randomUUID();
        const tagsetAuthID = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId, profileId) VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}', '${callout.profileId}')`
        );
      }
    }

    const innovationPacks: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from innovation_pack`);
    for (const innovationPack of innovationPacks) {
      const tagsets: { id: string; name: string; profileId: string }[] =
        await queryRunner.query(
          `SELECT id, name, profileId from tagset WHERE (profileId = '${innovationPack.profileId}')`
        );

      let hasDefaultTagset = false;
      for (const tagset of tagsets) {
        if (tagset.name == 'default') hasDefaultTagset = true;
      }

      if (!hasDefaultTagset) {
        const tagsetID = randomUUID();
        const tagsetAuthID = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId, profileId) VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}', '${innovationPack.profileId}')`
        );
      }

      const visuals: { id: string; name: string; profileId: string }[] =
        await queryRunner.query(
          `SELECT id, name, profileId from visual WHERE (profileId = '${innovationPack.profileId}')`
        );

      let hasCardVisual = false;
      for (const visual of visuals) {
        if (visual.name == VisualType.CARD) hasCardVisual = true;
      }

      if (!hasCardVisual) {
        const visualID = randomUUID();
        const visualAuthID = randomUUID();

        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${visualAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );

        await queryRunner.query(
          `INSERT INTO visual (id, createdDate, updatedDate, version, name, uri, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, allowedTypes, authorizationId, profileId)
            VALUES ('${visualID}', NOW(), NOW(), 1, '${templateVisual.name}', '', '${templateVisual.minWidth}', '${templateVisual.maxWidth}', '${templateVisual.minHeight}', '${templateVisual.maxHeight}', '${templateVisual.aspectRatio}', '${allowedTypes}', '${visualAuthID}', '${innovationPack.profileId}')`
        );
      }
    }

    const canvases: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from canvas`);
    for (const canvas of canvases) {
      const tagsets: { id: string; name: string; profileId: string }[] =
        await queryRunner.query(
          `SELECT id, name, profileId from tagset WHERE (profileId = '${canvas.profileId}')`
        );

      let hasDefaultTagset = false;
      for (const tagset of tagsets) {
        if (tagset.name == 'default') hasDefaultTagset = true;
      }

      if (!hasDefaultTagset) {
        const tagsetID = randomUUID();
        const tagsetAuthID = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${tagsetAuthID}', NOW(), NOW(), 1, '', '', 0, '')`
        );
        await queryRunner.query(
          `INSERT INTO tagset (id, createdDate, updatedDate, version, name, tags, authorizationId, profileId) VALUES ('${tagsetID}', NOW(), NOW(), 1, 'default', '', '${tagsetAuthID}', '${canvas.profileId}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration will remove default tagsets on all Callouts, InnovationPacks and Canvases, as well as CARD visuals on InnovationPacks
    const callouts: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from callout`);
    for (const callout of callouts) {
      const tagsets: {
        id: string;
        authorizationId: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId from tagset WHERE (profileId = '${callout.profileId}' AND name = 'default')`
      );
      for (const tagset of tagsets) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = '${tagset.authorizationId}'`
        );
        await queryRunner.query(`DELETE FROM tagset WHERE id = '${tagset.id}'`);
      }
    }
    const innovationPacks: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from innovation_pack`);
    for (const innovationPack of innovationPacks) {
      const tagsets: {
        id: string;
        authorizationId: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId from tagset WHERE (profileId = '${innovationPack.profileId}' AND name = 'default')`
      );
      for (const tagset of tagsets) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = '${tagset.authorizationId}'`
        );
        await queryRunner.query(`DELETE FROM tagset WHERE id = '${tagset.id}'`);
      }
      const visuals: { id: string; authorizationId: string }[] =
        await queryRunner.query(
          `SELECT id, authorizationId from visual WHERE (profileId = '${innovationPack.profileId}')`
        );
      for (const visual of visuals) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = '${visual.authorizationId}'`
        );
        await queryRunner.query(`DELETE FROM tagset WHERE id = '${visual.id}'`);
      }
    }
    const canvases: { id: string; profileId: string }[] =
      await queryRunner.query(`SELECT id, profileId from canvas`);
    for (const canvas of canvases) {
      const tagsets: { id: string; authorizationId: string }[] =
        await queryRunner.query(
          `SELECT id, authorizationId from tagset WHERE (profileId = '${canvas.profileId}' AND name = 'default')`
        );
      for (const tagset of tagsets) {
        await queryRunner.query(
          `DELETE FROM authorization_policy WHERE id = '${tagset.authorizationId}'`
        );
        await queryRunner.query(`DELETE FROM tagset WHERE id = '${tagset.id}'`);
      }
    }
  }
}
