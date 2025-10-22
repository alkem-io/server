import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

enum VisualType {
  AVATAR = 'avatar',
}

const VISUAL_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
] as const;

const DEFAULT_VISUAL_CONSTRAINTS = {
  [VisualType.AVATAR]: {
    minWidth: 190,
    maxWidth: 410,
    minHeight: 190,
    maxHeight: 410,
    aspectRatio: 1,
    allowedTypes: VISUAL_ALLOWED_TYPES,
  },
};

export class InnovationPacksAvatar1761125765749 implements MigrationInterface {
  name = 'InnovationPacksAvatar1761125765749';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find all innovation pack profiles that don't have an avatar visual yet
    const innovationPackProfiles = await queryRunner.query(`
      SELECT \`profile\`.\`id\` as profileId, \`profile\`.\`displayName\`
      FROM \`innovation_pack\`
      JOIN \`profile\` ON \`innovation_pack\`.\`profileId\` = \`profile\`.\`id\`
      WHERE NOT EXISTS (
        SELECT * FROM \`visual\`
        WHERE \`visual\`.\`profileId\` = \`profile\`.\`id\`
        AND \`visual\`.\`name\` = 'avatar'
      )
    `);

    for (const profile of innovationPackProfiles) {
      const { profileId, displayName } = profile;

      // Generate a random avatar URL based on the display name
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
          ?, NOW(), NOW(), 1, 'avatar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`,
        [
          randomUUID(),
          '',
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].minWidth,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].maxWidth,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].minHeight,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].maxHeight,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].aspectRatio,
          DEFAULT_VISUAL_CONSTRAINTS[VisualType.AVATAR].allowedTypes.join(','),
          authorizationId,
          profileId,
          null,
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
    // Remove avatar visuals added by this migration
    // could potentially delete avatar visuals added by users later!
    // await queryRunner.query(`
    //   DELETE \`visual\` FROM \`visual\`
    //   JOIN \`profile\` ON \`visual\`.\`profileId\` = \`profile\`.\`id\`
    //   JOIN \`innovation_pack\` ON \`innovation_pack\`.\`profileId\` = \`profile\`.\`id\`
    //   WHERE \`visual\`.\`name\` = 'avatar'
    // `);
  }
}
