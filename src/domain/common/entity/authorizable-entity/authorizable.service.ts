import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { IAuthorizable } from '.';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';

@Injectable()
export class AuthorizableService {
  constructor(private authorizationService: AuthorizationService) {}

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
    return this.authorizationService.getGrantedPrivileges(
      agentInfo.credentials,
      authorizationPolicy
    );
  }
}
