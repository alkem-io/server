import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthorizationPolicy1730877510629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the authorization ID on the ai_server table
    await this.updateAuthorizationPolicyTypeOnSingleton(
      queryRunner,
      'ai_server',
      'ai-server'
    );
    await this.updateAuthorizationPolicyTypeOnSingleton(
      queryRunner,
      'license_policy',
      'license-policy'
    );
    await this.updateAuthorizationPolicyTypeOnSingleton(
      queryRunner,
      'library',
      'library'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async updateAuthorizationPolicyTypeOnSingleton(
    queryRunner: QueryRunner,
    tableName: string,
    type: string
  ) {
    const entities: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM ${tableName}`
    );
    if (entities.length !== 1) {
      throw new Error(`Expected exactly one ${tableName} record`);
    }
    const entity = entities[0];
    // update the authorization policy to include the new type
    await queryRunner.query(
      `UPDATE authorization_policy SET type = '${type}' WHERE id = '${entity.authorizationId}'`
    );
  }
}
