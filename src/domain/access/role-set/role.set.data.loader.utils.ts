import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { inArray } from 'drizzle-orm';
import { roleSets } from './role.set.schema';
import { IRoleSet } from './role.set.interface';
import { AgentRoleKey } from './types';

/** Load credentials once per unique agentID across all keys using batch mget. */
export async function loadAgentCredentials(
  keys: readonly AgentRoleKey[],
  agentService: AgentService
): Promise<Map<string, ICredential[]>> {
  const uniqueAgentIDs = [
    ...new Set(keys.map(k => k.agentInfo.agentID).filter(id => id.length > 0)),
  ];
  return agentService.getAgentCredentialsBatch(uniqueAgentIDs);
}

/**
 * For any roleSet in the list whose `.roles` are not loaded,
 * batch-fetch them in a single DB query and attach to the objects.
 */
export async function ensureRolesLoaded(
  roleSetsList: IRoleSet[],
  db: DrizzleDb
): Promise<void> {
  const needsLoad = roleSetsList.filter(rs => !rs.roles);
  if (needsLoad.length === 0) return;

  const uniqueIds = [...new Set(needsLoad.map(rs => rs.id))];
  const loaded = await db.query.roleSets.findMany({
    where: inArray(roleSets.id, uniqueIds),
    with: { roles: true },
  });
  const rolesById = new Map(loaded.map(rs => [rs.id, rs.roles]));

  for (const rs of needsLoad) {
    rs.roles = rolesById.get(rs.id) as any;
  }
}
