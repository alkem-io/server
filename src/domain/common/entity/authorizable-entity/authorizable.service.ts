import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { IAuthorizable } from '.';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationEngineService } from '@services/platform/authorization-engine/authorization-engine.service';

@Injectable()
export class AuthorizableService {
  constructor(private authorizationEngine: AuthorizationEngineService) {}

  getGrantedPrivileges(
    authorizable: IAuthorizable,
    agentInfo: AgentInfo
  ): AuthorizationPrivilege[] {
    if (!agentInfo || !agentInfo.credentials) return [];
    const authorizationPolicy = authorizable.authorization;
    if (!authorizationPolicy)
      throw new RelationshipNotFoundException(
        `Unable to retrieve AuthorizationPolicy on authorizable entity ${authorizable.id} `,
        LogContext.AUTH
      );
    return this.authorizationEngine.getGrantedPrivileges(
      agentInfo.credentials,
      authorizationPolicy
    );
  }
}
