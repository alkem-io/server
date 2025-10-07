import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import { VisualType } from '@common/enums/visual.type';

export class addBannerToWhiteboardContributions1759313997577
  implements MigrationInterface
{
  name = 'addBannerToWhiteboardContributions1759313997577';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find the card visuals for profiles (of the whiteboards of the contributions) that do not have a banner visual
    // We cannot do anything if the profile has no card visual (and it should not happen in practice)
    const cardVisuals = await queryRunner.query(`
        SELECT \`visual\`.* FROM \`callout_contribution\`
          JOIN \`whiteboard\` ON \`callout_contribution\`.\`whiteboardId\` = \`whiteboard\`.\`id\`
          JOIN \`profile\` ON \`whiteboard\`.\`profileId\` = \`profile\`.\`id\`
          JOIN \`visual\` ON \`profile\`.\`id\` = \`visual\`.\`profileId\`
        WHERE \`name\` = 'card' AND NOT EXISTS (
          SELECT * FROM \`visual\` AS \`visual2\` WHERE \`visual2\`.\`profileId\` = \`visual\`.\`profileId\` AND \`visual2\`.\`name\` = 'banner'
        )`);

    for (const cardVisual of cardVisuals) {
      const { uri, profileId, alternativeText } = cardVisual;
      const authorizationId = await this.createAuthorizationPolicy(queryRunner);
      await queryRunner.query(
        `
        INSERT INTO \`visual\` (
          \`id\`,
          \`createdDate\`,
          \`updatedDate\`,
          \`version\`,
          \`name\`,
          \`uri\`,
          \`minWidth\`,
          \`maxWidth\`,
          \`minHeight\`,
          \`maxHeight\`,
          \`aspectRatio\`,
          \`allowedTypes\`,
          \`authorizationId\`,
          \`profileId\`,
          \`alternativeText\`
      ) VALUES (
        ?, NOW(), NOW(), 1, 'banner', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
        [
          randomUUID(),
          uri,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER].minWidth,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER].maxWidth,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER].minHeight,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER].maxHeight,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER].aspectRatio,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER].allowedTypes.join(','),
          authorizationId,
          profileId,
          alternativeText,
        ]
      );
    }
  }

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type)
                 VALUES (?, ?, ?, ?, ?, ?)`,
      [authID, 1, '[]', '[]', '[]', 'visual']
    );
    return authID;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // N/A
  }
}
