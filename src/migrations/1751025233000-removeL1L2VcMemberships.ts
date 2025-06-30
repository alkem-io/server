import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveL1L2VcMemberships1751025233000
  implements MigrationInterface
{
  name = 'RemoveL1L2VcMemberships1751025233000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get all spaces with level L1 and L2
    const l1l2Spaces: { id: string; level: number }[] =
      await queryRunner.query(`
      SELECT id, level FROM space
      WHERE level IN (1, 2)
    `);

    if (l1l2Spaces.length === 0) {
      console.log('No L1 or L2 spaces found, skipping VC membership removal');
      return;
    }

    console.log(`Found ${l1l2Spaces.length} L1/L2 spaces to process`);

    // Get space IDs for the IN clause
    const spaceIds = l1l2Spaces.map(space => `'${space.id}'`).join(',');

    // Find all credentials for Virtual Contributors that grant them membership in L1/L2 spaces
    const vcCredentialsToRemove: {
      credentialId: string;
      vcId: string;
      spaceId: string;
      credentialType: string;
      agentId: string;
    }[] = await queryRunner.query(`
      SELECT
        c.id as credentialId,
        vc.id as vcId,
        c.resourceID as spaceId,
        c.type as credentialType,
        a.id as agentId
      FROM credential c
      INNER JOIN agent a ON c.agentId = a.id
      INNER JOIN virtual_contributor vc ON vc.agentId = a.id
      WHERE c.type IN ('space-member', 'space-admin', 'space-lead', 'space-subspace-admin')
        AND c.resourceID IN (${spaceIds})
    `);

    console.log(
      `Found ${vcCredentialsToRemove.length} VC credentials to remove from L1/L2 spaces`
    );

    // Log what we're about to remove for transparency
    for (const vcCredential of vcCredentialsToRemove) {
      const spaceInfo = l1l2Spaces.find(s => s.id === vcCredential.spaceId);
      console.log(
        `Removing ${vcCredential.credentialType} credential for VC ${vcCredential.vcId} ` +
          `from L${spaceInfo?.level} space ${vcCredential.spaceId}`
      );
    }

    // Remove the credentials
    let removedCount = 0;
    for (const vcCredential of vcCredentialsToRemove) {
      try {
        await queryRunner.query(`DELETE FROM credential WHERE id = ?`, [
          vcCredential.credentialId,
        ]);
        removedCount++;
      } catch (error) {
        console.error(
          `Error removing credential ${vcCredential.credentialId} for VC ${vcCredential.vcId}: ${error}`
        );
        // Continue with other credentials even if one fails
      }
    }

    console.log(
      `Successfully removed ${removedCount} VC credentials from L1/L2 spaces`
    );

    // Verify the cleanup
    const remainingVcCredentials = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM credential c
      INNER JOIN agent a ON c.agentId = a.id
      INNER JOIN virtual_contributor vc ON vc.agentId = a.id
      WHERE c.type IN ('space-member', 'space-admin', 'space-lead')
        AND c.resourceID IN (${spaceIds})
    `);

    if (remainingVcCredentials[0]?.count > 0) {
      console.warn(
        `Warning: ${remainingVcCredentials[0].count} VC credentials still remain in L1/L2 spaces after cleanup`
      );
    } else {
      console.log(
        '✅ Successfully removed all VC memberships from L1/L2 spaces'
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration is not easily reversible since we're removing data
    // and we don't have a reliable way to know which VCs should be re-added
    // to which L1/L2 spaces with which roles.
    //
    // If reversal is needed, it would require:
    // 1. Manual backup of the credentials before running the up() migration
    // 2. Restoring from that backup
    //
    // For now, we'll just log a warning
    console.warn(
      'WARNING: This migration (RemoveL1L2VcMemberships) is not reversible. ' +
        'Virtual Contributor memberships in L1/L2 spaces cannot be automatically restored. ' +
        'If you need to restore these memberships, you will need to manually re-assign ' +
        'the Virtual Contributors to the appropriate L1/L2 space communities.'
    );
  }
}
