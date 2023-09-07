import { MigrationInterface, QueryRunner } from 'typeorm';

export class bannerWide1693849042225 implements MigrationInterface {
  name = 'bannerWide1693849042225';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name from visual`
    );
    for (const visual of visuals) {
      // get rid of bannerNarrow
      if (visual.name === 'bannerNarrow') {
        await queryRunner.query(
          `UPDATE \`alkemio\`.\`visual\` SET \`name\` = 'card' WHERE \`id\`= '${visual.id}'`
        );
      }
    }

    const hubs: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(`SELECT id, profileId from innovation_hub`);
    for (const hub of hubs) {
      const visuals: {
        id: string;
        name: string;
      }[] = await queryRunner.query(
        `SELECT id, name from visual where \`profileId\`= '${hub.profileId}'`
      );
      for (const visual of visuals) {
        if (visual.name === banner.name) {
          await queryRunner.query(
            `UPDATE \`alkemio\`.\`visual\` SET
                \`name\` = '${bannerWide.name}',
                \`aspectRatio\` = '${bannerWide.aspectRatio}',
                \`minWidth\` = '${bannerWide.minWidth}',
                \`maxWidth\` = '${bannerWide.maxWidth}',
                \`minHeight\` = '${bannerWide.minHeight}',
                \`maxHeight\` = '${bannerWide.maxHeight}'
                  WHERE \`id\`= '${visual.id}'`
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const visuals: any[] = await queryRunner.query(
      `SELECT id, name from visual`
    );
    for (const visual of visuals) {
      // move back to bannerNarrow
      if (visual.name === 'card') {
        await queryRunner.query(
          `UPDATE \`alkemio\`.\`visual\` SET \`name\` = 'bannerNarrow' WHERE \`id\`= '${visual.id}'`
        );
      }
    }

    const hubs: {
      id: string;
      profileId: string;
    }[] = await queryRunner.query(`SELECT id, profileId from innovation_hub`);
    for (const hub of hubs) {
      const visuals: {
        id: string;
        name: string;
      }[] = await queryRunner.query(
        `SELECT id, name from visual where \`profileId\`= '${hub.profileId}'`
      );
      for (const visual of visuals) {
        if (visual.name === bannerWide.name) {
          await queryRunner.query(
            `UPDATE \`alkemio\`.\`visual\` SET
                \`name\` = '${banner.name}',
                \`aspectRatio\` = '${banner.aspectRatio}',
                \`minWidth\` = '${banner.minWidth}',
                \`maxWidth\` = '${banner.maxWidth}',
                \`minHeight\` = '${banner.minHeight}',
                \`maxHeight\` = '${banner.maxHeight}'
                  WHERE \`id\`= '${visual.id}'`
          );
        }
      }
    }
  }
}

const bannerWide = {
  name: 'bannerWide',
  minWidth: 640,
  maxWidth: 2560,
  minHeight: 64,
  maxHeight: 256,
  aspectRatio: 10,
};

const banner = {
  name: 'banner',
  minWidth: 384,
  maxWidth: 1536,
  minHeight: 64,
  maxHeight: 256,
  aspectRatio: 6,
};
