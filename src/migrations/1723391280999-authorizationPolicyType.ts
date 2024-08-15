import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthorizationPolicyType1723121607999
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the type column to the storage aggregator table
    await queryRunner.query(
      'ALTER TABLE `authorization_policy` ADD `type` varchar(128) NULL'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'account',
      'account'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'space_defaults',
      'space-defaults'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'space',
      'space'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'user',
      'user'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'organization',
      'organization'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'organization_verification',
      'organization-verification'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'platform',
      'platform'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'profile',
      'profile'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'preference',
      'preference'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'reference',
      'reference'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'tagset',
      'tagset'
    );
    await this.updateAuthorizationPolicyTypeForEntity(
      queryRunner,
      'visual',
      'visual'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('No down migration for AuthorizationPolicyType1723121607999');
  }

  private async updateAuthorizationPolicyTypeForEntity(
    queryRunner: QueryRunner,
    entityType: string,
    authorizationPolicyType: string
  ) {
    const entities: {
      id: string;
      authorizationId: string;
    }[] = await queryRunner.query(
      `SELECT id, authorizationId FROM \`${entityType}\``
    );
    for (const entity of entities) {
      const [authorizationPolicy]: {
        id: string;
      }[] = await queryRunner.query(
        `SELECT id FROM authorization_policy WHERE id = '${entity.authorizationId}'`
      );
      if (authorizationPolicy) {
        await queryRunner.query(
          `UPDATE \`authorization_policy\` SET type = '${authorizationPolicyType}' WHERE id = '${authorizationPolicy.id}'`
        );
      } else {
        console.log(
          `No storage_aggregator found for ${entityType}: ${entity.id}`
        );
      }
    }
  }
}
