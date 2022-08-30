import { MigrationInterface, QueryRunner } from 'typeorm';

export class bannerResolution1661800143518 implements MigrationInterface {
  name = 'bannerResolution1661800143518';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, contextId from visual`
    );
    for (const visual of visuals) {
      if (visual.contextId) {
        // a visual in a Context
        if (visual.name === 'banner') {
          await queryRunner.query(
            `UPDATE \`alkemio\`.\`visual\` SET \`minWidth\` = '${newBanner.minWidth}', \`maxWidth\` = '${newBanner.maxWidth}',
                  \`minHeight\` = '${newBanner.minHeight}', \`maxHeight\` = '${newBanner.maxHeight}', \`aspectRatio\` = '${newBanner.aspectRatio}' WHERE \`id\`= '${visual.id}'`
          );
        } else if (visual.name === 'bannerNarrow') {
          await queryRunner.query(
            `UPDATE \`alkemio\`.\`visual\` SET \`minWidth\` = '${newBannerNarrow.minWidth}', \`maxWidth\` = '${newBannerNarrow.maxWidth}',
                  \`minHeight\` = '${newBannerNarrow.minHeight}', \`maxHeight\` = '${newBannerNarrow.maxHeight}', \`aspectRatio\` = '${newBannerNarrow.aspectRatio}'   WHERE \`id\` = '${visual.id}'`
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name, contextId from visual`
    );
    for (const visual of visuals) {
      if (visual.contextId) {
        // a visual in a Context
        if (visual.name === 'banner') {
          await queryRunner.query(
            `UPDATE \`alkemio\`.\`visual\` SET \`minWidth\` = '${oldBanner.minWidth}', \`maxWidth\` = '${oldBanner.maxWidth}',
                  \`minHeight\` = '${oldBanner.minHeight}', \`maxHeight\` = '${oldBanner.maxHeight}', \`aspectRatio\` = '${oldBanner.aspectRatio}'  WHERE (id = '${visual.id}')`
          );
        } else if (visual.name === 'bannerNarrow') {
          await queryRunner.query(
            `UPDATE \`alkemio\`.\`visual\` SET \`minWidth\` = '${oldBannerNarrow.minWidth}', \`maxWidth\` = '${oldBannerNarrow.maxWidth}',
                  \`minHeight\` = '${oldBannerNarrow.minHeight}', \`maxHeight\` = '${oldBannerNarrow.maxHeight}', \`aspectRatio\` = '${oldBannerNarrow.aspectRatio}'   WHERE (id = '${visual.id}')`
          );
        }
      }
    }
  }
}

const newBanner = {
  name: 'banner',
  minWidth: 1024,
  maxWidth: 1536,
  minHeight: 192,
  maxHeight: 256,
  aspectRatio: 6,
};

const newBannerNarrow = {
  name: 'bannerNarrow',
  minWidth: 512,
  maxWidth: 768,
  minHeight: 192,
  maxHeight: 256,
  aspectRatio: 3,
};

const oldBanner = {
  name: 'banner',
  minWidth: 384,
  maxWidth: 768,
  minHeight: 32,
  maxHeight: 128,
  aspectRatio: 6,
};

const oldBannerNarrow = {
  name: 'bannerNarrow',
  minWidth: 192,
  maxWidth: 384,
  minHeight: 32,
  maxHeight: 128,
  aspectRatio: 3,
};
