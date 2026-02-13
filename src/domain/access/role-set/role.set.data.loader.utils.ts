import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { In, Repository } from 'typeorm';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { AgentRoleKey } from './types';

/** Load credentials once per unique agentID across all keys. */
export async function loadAgentCredentials(
  keys: readonly AgentRoleKey[],
  agentService: AgentService
): Promise<Map<string, ICredential[]>> {
  const map = new Map<string, ICredential[]>();
  const uniqueAgentIDs = [
    ...new Set(keys.map(k => k.agentInfo.agentID).filter(id => id.length > 0)),
  ];
  for (const agentID of uniqueAgentIDs) {
    const { credentials } = await agentService.getAgentCredentials(agentID);
    map.set(agentID, credentials);
  }
  return map;
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
