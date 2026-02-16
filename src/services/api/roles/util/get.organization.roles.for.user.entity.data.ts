import { Organization } from '@src/domain/community/organization';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { inArray } from 'drizzle-orm';
import { organizations } from '@domain/community/organization/organization.schema';

export const getOrganizationRolesForUserEntityData = async (
  db: DrizzleDb,
  organizationIds: string[]
): Promise<Organization[]> => {
  const result = await db.query.organizations.findMany({
    where: inArray(organizations.id, organizationIds),
    with: {
      profile: {
        columns: {
          displayName: true,
        },
      },
    },
  });
  return result as unknown as Organization[];
};
