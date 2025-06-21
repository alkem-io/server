import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoleSetL2Fix1750500585169 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // get all spaces with level L2, then the community, roleSet with parent role set
    const spaces: {
      spaceId: string;
      roleSetId: string;
      parentRoleSetId: string | null;
    }[] = await queryRunner.query(`
        SELECT s.id as spaceId, rs.id as roleSetId, rs.parentRoleSetId as parentRoleSetId
        FROM space s
        JOIN community c ON s.communityId = c.id
        JOIN role_set rs ON c.roleSetId = rs.id
        WHERE s.level = '2'
      `);
    // Iterate over all the spaces
    for (const space of spaces) {
      // get all the role definitions for the roleSetId
      const roleDefinitions: {
        id: string;
        parentCredentials: string[];
        name: string;
      }[] = await queryRunner.query(
        `SELECT id, parentCredentials, name FROM \`role\` WHERE roleSetId = ?`,
        [space.roleSetId]
      );

      // Also get for the parent role set
      const parentRoleDefinitions: {
        id: string;
        parentCredentials: string[];
        name: string;
      }[] = await queryRunner.query(
        `SELECT id, parentCredentials, name FROM \`role\` WHERE roleSetId = ?`,
        [space.parentRoleSetId]
      );

      if (!roleDefinitions || roleDefinitions.length === 0) {
        console.log(
          `No role definitions found for space ${space.spaceId} with role set ${space.roleSetId}`
        );
        continue;
      }
      for (const roleDefinition of roleDefinitions) {
        console.log(
          `Processing role ${roleDefinition.name} in space ${space.spaceId}`
        );
        if (roleDefinition.parentCredentials.length === 1) {
          console.log(
            `Found role definition at L2 with just one parent credential ${roleDefinition.name} in space ${space.spaceId}`
          );
          // These are the role definitions to fix
          // Find the equivalent parent role definition
          const parentRoleDefinition = parentRoleDefinitions.find(
            r => r.name === roleDefinition.name
          );
          if (!parentRoleDefinition) {
            const msg = `No parent role definition found for role ${roleDefinition.name} in space ${space.spaceId}`;
            console.error(`${msg}`);
            throw new Error(`${msg}`);
          }
          const newParentCredentials = [
            ...parentRoleDefinition.parentCredentials,
            ...roleDefinition.parentCredentials,
          ];
          console.log(
            `Updating role ${roleDefinition.name} in space ${space.spaceId} with new parent credentials: ${newParentCredentials}`
          );
          // Update the role definition with the new parent credentials
          await queryRunner.query(
            `UPDATE \`role\` SET parentCredentials = ? WHERE id = ?`,
            [JSON.stringify(newParentCredentials), roleDefinition.id]
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
