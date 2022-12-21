import { MigrationInterface, QueryRunner } from 'typeorm';

const newBannerNarrowMetaData = {
  maxHeight: 256,
  maxWidth: 410,
  minHeight: 192,
  minWidth: 307,
  aspectRatio: 1.6,
};

const oldBannerNarrowMetaData = {
  maxWidth: 768,
  minWidth: 512,
  maxHeight: 256,
  minHeight: 192,
  aspectRatio: 3,
};

export class bannerNarrowMetaData1671604452665 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const visuals: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name from visual`
    );
    for (const visual of visuals) {
      if (visual.name === 'bannerNarrow') {
        await queryRunner.query(
          `UPDATE visual 
                SET minWidth = '${newBannerNarrowMetaData.minWidth}', 
                    maxWidth = '${newBannerNarrowMetaData.maxWidth}', 
                    minHeight = '${newBannerNarrowMetaData.minHeight}', 
                    maxHeight = '${newBannerNarrowMetaData.maxHeight}', 
                    aspectRatio = '${newBannerNarrowMetaData.aspectRatio}'
                WHERE id = '${visual.id}'`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const visuals: { id: string; name: string }[] = await queryRunner.query(
      `SELECT id, name from visual`
    );
    for (const visual of visuals) {
      if (visual.name === 'bannerNarrow') {
        await queryRunner.query(
          `UPDATE visual 
                  SET minWidth = '${oldBannerNarrowMetaData.minWidth}', 
                      maxWidth = '${oldBannerNarrowMetaData.maxWidth}', 
                      minHeight = '${oldBannerNarrowMetaData.minHeight}', 
                      maxHeight = '${oldBannerNarrowMetaData.maxHeight}', 
                      aspectRatio = '${oldBannerNarrowMetaData.aspectRatio}'
                  WHERE id = '${visual.id}'`
        );
      }
    }
  }
}
