import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { In, Repository } from 'typeorm';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { ActorRoleKey } from './types';

/** Load credentials once per unique actorId across all keys. */
export async function loadActorCredentials(
  keys: readonly ActorRoleKey[],
  actorService: ActorService
): Promise<Map<string, ICredential[]>> {
  const uniqueActorIds = [
    ...new Set(
      keys.map(k => k.actorContext.actorId).filter(id => id.length > 0)
    ),
  ];
  const result = new Map<string, ICredential[]>();
  await Promise.all(
    uniqueActorIds.map(async actorId => {
      const { credentials } = await actorService.getActorCredentials(actorId);
      result.set(actorId, credentials);
    })
  );
  return result;
}

/**
 * For any roleSet in the list whose `.roles` are not loaded,
 * batch-fetch them in a single DB query and attach to the objects.
 */
export async function ensureRolesLoaded(
  roleSets: IRoleSet[],
  roleSetRepository: Repository<RoleSet>
): Promise<void> {
  const needsLoad = roleSets.filter(rs => !rs.roles);
  if (needsLoad.length === 0) return;

  const uniqueIds = [...new Set(needsLoad.map(rs => rs.id))];
  const loaded = await roleSetRepository.find({
    where: { id: In(uniqueIds) },
    relations: { roles: true },
  });
  const rolesById = new Map(loaded.map(rs => [rs.id, rs.roles]));

  for (const rs of needsLoad) {
    rs.roles = rolesById.get(rs.id);
  }
}
