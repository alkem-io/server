import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const VisualType_BANNER = 'banner';
const VisualType_WHITEBOARD_PREVIEW = 'whiteboardPreview';
const VisualType_CARD = 'card';

const VISUAL_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
] as const;

const cardConstraints = {
  minWidth: 307,
  maxWidth: 410,
  minHeight: 192,
  maxHeight: 256,
  aspectRatio: 1.6,
  allowedTypes: VISUAL_ALLOWED_TYPES,
};
const whiteboardPreviewConstraints = {
  minWidth: 500,
  maxWidth: 1800,
  minHeight: 200,
  maxHeight: 720,
  aspectRatio: 2.5,
  allowedTypes: VISUAL_ALLOWED_TYPES,
};

const bannerConstraints = {
  minWidth: 384,
  maxWidth: 1536,
  minHeight: 64,
  maxHeight: 256,
  aspectRatio: 6,
  allowedTypes: VISUAL_ALLOWED_TYPES,
};

export class WhiteboardBannerVisuals1760960016268
  implements MigrationInterface
{
  name = 'WhiteboardBannerVisuals1760960016268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update all banner visuals that belong to whiteboards
    // Change name from 'banner' to 'whiteboardPreview' and update constraints

    await queryRunner.query(
      `
      UPDATE visual v
      INNER JOIN whiteboard w ON v.profileId = w.profileId
      SET
        v.name = ?,
        v.minWidth = ?,
        v.maxWidth = ?,
        v.minHeight = ?,
        v.maxHeight = ?,
        v.aspectRatio = ?,
        v.allowedTypes = ?
      WHERE v.name = ?
      `,
      [
        VisualType_WHITEBOARD_PREVIEW,
        whiteboardPreviewConstraints.minWidth,
        whiteboardPreviewConstraints.maxWidth,
        whiteboardPreviewConstraints.minHeight,
        whiteboardPreviewConstraints.maxHeight,
        whiteboardPreviewConstraints.aspectRatio,
        whiteboardPreviewConstraints.allowedTypes.join(','),
        VisualType_BANNER,
      ]
    );

    // Step 2: Delete any invalid visuals on whiteboards
    // (visuals with names other than 'card' or 'whiteboardPreview')
    await queryRunner.query(
      `
      DELETE v FROM visual v
      INNER JOIN whiteboard w ON v.profileId = w.profileId
      WHERE v.name NOT IN (?, ?)
      `,
      [VisualType_CARD, VisualType_WHITEBOARD_PREVIEW]
    );

    // Step 3: Ensure all card visuals have correct constraints
    await queryRunner.query(
      `
      UPDATE visual v
      INNER JOIN whiteboard w ON v.profileId = w.profileId
      SET
        v.minWidth = ?,
        v.maxWidth = ?,
        v.minHeight = ?,
        v.maxHeight = ?,
        v.aspectRatio = ?,
        v.allowedTypes = ?
      WHERE v.name = ?
      `,
      [
        cardConstraints.minWidth,
        cardConstraints.maxWidth,
        cardConstraints.minHeight,
        cardConstraints.maxHeight,
        cardConstraints.aspectRatio,
        cardConstraints.allowedTypes.join(','),
        VisualType_CARD,
      ]
    );

    // Step 4: Ensure all whiteboardPreview visuals have correct constraints
    await queryRunner.query(
      `
      UPDATE visual v
      INNER JOIN whiteboard w ON v.profileId = w.profileId
      SET
        v.minWidth = ?,
        v.maxWidth = ?,
        v.minHeight = ?,
        v.maxHeight = ?,
        v.aspectRatio = ?,
        v.allowedTypes = ?
      WHERE v.name = ?
      `,
      [
        whiteboardPreviewConstraints.minWidth,
        whiteboardPreviewConstraints.maxWidth,
        whiteboardPreviewConstraints.minHeight,
        whiteboardPreviewConstraints.maxHeight,
        whiteboardPreviewConstraints.aspectRatio,
        whiteboardPreviewConstraints.allowedTypes.join(','),
        VisualType_WHITEBOARD_PREVIEW,
      ]
    );

    // Step 5: Find whiteboards missing a card visual
    const whiteboardsMissingCard = await queryRunner.query(
      `
      SELECT DISTINCT w.profileId
      FROM whiteboard w
      WHERE NOT EXISTS (
        SELECT 1 FROM visual v
        WHERE v.profileId = w.profileId
        AND v.name = ?
      )
      `,
      [VisualType_CARD]
    );

    // Step 6: Create missing card visuals
    for (const { profileId } of whiteboardsMissingCard) {
      const authorizationId = await this.createAuthorizationPolicy(queryRunner);

      await queryRunner.query(
        `
        INSERT INTO visual (
          id,
          createdDate,
          updatedDate,
          version,
          name,
          uri,
          minWidth,
          maxWidth,
          minHeight,
          maxHeight,
          aspectRatio,
          allowedTypes,
          authorizationId,
          profileId
        ) VALUES (?, NOW(), NOW(), 1, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          VisualType_CARD,
          cardConstraints.minWidth,
          cardConstraints.maxWidth,
          cardConstraints.minHeight,
          cardConstraints.maxHeight,
          cardConstraints.aspectRatio,
          cardConstraints.allowedTypes.join(','),
          authorizationId,
          profileId,
        ]
      );
    }

    // Step 7: Find whiteboards missing a whiteboardPreview visual
    const whiteboardsMissingPreview = await queryRunner.query(
      `
      SELECT DISTINCT w.profileId
      FROM whiteboard w
      WHERE NOT EXISTS (
        SELECT 1 FROM visual v
        WHERE v.profileId = w.profileId
        AND v.name = ?
      )
      `,
      [VisualType_WHITEBOARD_PREVIEW]
    );

    // Step 8: Create missing whiteboardPreview visuals
    for (const { profileId } of whiteboardsMissingPreview) {
      const authorizationId = await this.createAuthorizationPolicy(queryRunner);

      await queryRunner.query(
        `
        INSERT INTO visual (
          id,
          createdDate,
          updatedDate,
          version,
          name,
          uri,
          minWidth,
          maxWidth,
          minHeight,
          maxHeight,
          aspectRatio,
          allowedTypes,
          authorizationId,
          profileId
        ) VALUES (?, NOW(), NOW(), 1, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          VisualType_WHITEBOARD_PREVIEW,
          whiteboardPreviewConstraints.minWidth,
          whiteboardPreviewConstraints.maxWidth,
          whiteboardPreviewConstraints.minHeight,
          whiteboardPreviewConstraints.maxHeight,
          whiteboardPreviewConstraints.aspectRatio,
          whiteboardPreviewConstraints.allowedTypes.join(','),
          authorizationId,
          profileId,
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
    // Revert whiteboardPreview visuals that belong to whiteboards back to banner
    // Note: visuals inserted in up() intentionally remain in place; rollback is not fully reversible.

    await queryRunner.query(
      `
      UPDATE visual v
      INNER JOIN whiteboard w ON v.profileId = w.profileId
      SET
        v.name = ?,
        v.minWidth = ?,
        v.maxWidth = ?,
        v.minHeight = ?,
        v.maxHeight = ?,
        v.aspectRatio = ?,
        v.allowedTypes = ?
      WHERE v.name = ?
      `,
      [
        VisualType_BANNER,
        bannerConstraints.minWidth,
        bannerConstraints.maxWidth,
        bannerConstraints.minHeight,
        bannerConstraints.maxHeight,
        bannerConstraints.aspectRatio,
        bannerConstraints.allowedTypes.join(','),
        VisualType_WHITEBOARD_PREVIEW,
      ]
    );
  }
}
