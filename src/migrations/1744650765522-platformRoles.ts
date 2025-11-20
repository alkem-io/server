import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformRoles1744650765522 implements MigrationInterface {
  platformManagerName = 'global-platform-manager';
  supportManagerName = 'global-support-manager';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // select the platform entity to get the roleSet id
    const [platform]: {
      id: string;
      roleSetId: string;
    }[] = await queryRunner.query(`SELECT id, roleSetId FROM \`platform\``);
    if (!platform) {
      throw new Error(`No platform found`);
    }
    // create a new role entity for the platform roleSet

    // Create if not already created
    const platformRoles: {
      id: string;
      name: string;
    }[] = await queryRunner.query(
      `SELECT id, name FROM \`role\` WHERE roleSetId = '${platform.roleSetId}'`
    );
    const existingPlatformManager = platformRoles.find(
      role => role.name === this.platformManagerName
    );
    if (!existingPlatformManager) {
      await this.createPlatformRole(
        queryRunner,
        platform.roleSetId,
        this.platformManagerName
      );
    }
    const existingSupportManager = platformRoles.find(
      role => role.name === this.supportManagerName
    );
    if (!existingSupportManager) {
      await this.createPlatformRole(
        queryRunner,
        platform.roleSetId,
        this.supportManagerName
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createPlatformRole(
    queryRunner: QueryRunner,
    roleSetId: string,
    roleName: string
  ): Promise<void> {
    const roleID = randomUUID();
    await queryRunner.query(
      `INSERT INTO role (id,
                          version,
                          roleSetId,
                          name,
                          credential,
                          parentCredentials,
                          requiresEntryRole,
                          requiresSameRoleInParentRoleSet,
                          userPolicy,
                          organizationPolicy,
                          virtualContributorPolicy)
                  VALUES ('${roleID}',
                          1,
                          '${roleSetId}',
                          '${roleName}',
                          '{"type": "${roleName}", "resourceID": ""}',
                          '[]',
                          '0',
                          '0',
                          '{"maximum": -1, "minimum": 0}',
                          '{"maximum": 0, "minimum": 0}',
                          '{"maximum": 0, "minimum": 0}')`
    );
  }
}
