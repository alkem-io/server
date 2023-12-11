import { MigrationInterface, QueryRunner } from 'typeorm';

export class journeyProfileTypeFix1702042604746 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const name_type_mappings = [
      { tableName: 'space', profileType: ProfileType.SPACE },
      { tableName: 'challenge', profileType: ProfileType.CHALLENGE },
      { tableName: 'opportunity', profileType: ProfileType.OPPORTUNITY },
    ];
    for (const mapping of name_type_mappings) {
      await this.updateProfileType(
        queryRunner,
        mapping.tableName,
        mapping.profileType
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async updateProfileType(
    queryRunner: QueryRunner,
    tableName: string,
    profileType: ProfileType
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE ${tableName} JOIN profile SET profile.type = '${profileType}' WHERE profile.id = ${tableName}.profileId`
    );
  }
}
enum ProfileType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}
