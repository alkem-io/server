import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IRoleSet } from '../role.set.interface';

export type AgentRoleKey = {
  agentInfo: AgentInfo;
  roleSet: IRoleSet;
};
