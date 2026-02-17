import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Space } from '@domain/space/space/space.entity';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { inArray, and } from 'drizzle-orm';
import { spaces } from '@domain/space/space/space.schema';

export const getSpaceRolesForContributorEntityData = async (
  db: DrizzleDb,
  spaceIds: string[],
  spaceAllowedVisibilities: SpaceVisibility[]
) => {
  const fetchData = async (
    ids: string[],
    levels: number[],
    visibility?: SpaceVisibility[]
  ): Promise<Space[]> => {
    const conditions = [
      inArray(spaces.id, ids),
      inArray(spaces.level, levels),
    ];

    if (visibility) {
      conditions.push(inArray(spaces.visibility, visibility));
    }

    const result = await db.query.spaces.findMany({
      where: and(...conditions),
      with: {
        authorization: true,
        about: {
          with: {
            profile: true,
          },
        },
      },
    });
    return result as unknown as Space[];
  };

  const [spacesResult, subspaces] = await Promise.all([
    fetchData(spaceIds, [SpaceLevel.L0], spaceAllowedVisibilities),
    fetchData(spaceIds, [SpaceLevel.L1, SpaceLevel.L2]),
  ]);

  return { spaces: spacesResult, subspaces };
};
