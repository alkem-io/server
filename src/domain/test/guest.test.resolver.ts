import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhoAmIDto } from './dto/who.am.i.dto';
import { CredentialInfoDto } from './dto/credential.info.dto';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { UserAuthenticationStatus } from './enums/user.authentication.status';

@Resolver()
export class GuestTestResolver {
  @UseGuards(GraphqlGuard)
  @Query(() => WhoAmIDto, {
    description:
      'Get information about the current user, guest, or anonymous visitor',
  })
  async whoAmI(@CurrentUser() agentInfo: AgentInfo): Promise<WhoAmIDto> {
    const isAuthenticated = !!agentInfo.userID;
    const isGuest =
      agentInfo.credentials.some(
        cred => cred.type === AuthorizationCredential.GLOBAL_GUEST
      ) || !!agentInfo.guestName;

    let displayName: string;
    let authenticationStatus: UserAuthenticationStatus;

    if (isAuthenticated) {
      displayName = agentInfo.firstName
        ? `${agentInfo.firstName} ${agentInfo.lastName}`.trim()
        : agentInfo.email || `User ${agentInfo.userID}`;
      authenticationStatus = UserAuthenticationStatus.AUTHENTICATED;
    } else if (isGuest) {
      displayName = agentInfo.guestName || 'Guest User';
      authenticationStatus = UserAuthenticationStatus.GUEST;
    } else {
      displayName = 'Anonymous User';
      authenticationStatus = UserAuthenticationStatus.ANONYMOUS;
    }

    // Map credentials to detailed information
    const credentialInfos: CredentialInfoDto[] = agentInfo.credentials.map(
      cred => ({
        type: cred.type,
        resourceID: cred.resourceID || '(global)',
        description: this.getCredentialDescription(cred.type, cred.resourceID),
      })
    );

    return {
      displayName,
      authenticationStatus,
      userID: agentInfo.userID,
      guestName: agentInfo.guestName,
      roles: [], // Roles would need to be derived from credentials in a real implementation
      credentials: credentialInfos,
    };
  }

  private getCredentialDescription(type: string, resourceID?: string): string {
    const resourcePart = resourceID ? ` for resource ${resourceID}` : '';

    switch (type) {
      case AuthorizationCredential.GLOBAL_ANONYMOUS:
        return 'Global anonymous access';
      case AuthorizationCredential.GLOBAL_GUEST:
        return 'Global guest access (ephemeral user)';
      case AuthorizationCredential.GLOBAL_REGISTERED:
        return 'Global registered user access';
      case AuthorizationCredential.GLOBAL_ADMIN:
        return 'Global platform administrator';
      case AuthorizationCredential.GLOBAL_SUPPORT:
        return 'Global platform support';
      case AuthorizationCredential.SPACE_MEMBER:
        return `Space member${resourcePart}`;
      case AuthorizationCredential.SPACE_LEAD:
        return `Space lead${resourcePart}`;
      case AuthorizationCredential.SPACE_ADMIN:
        return `Space administrator${resourcePart}`;
      case AuthorizationCredential.ORGANIZATION_ASSOCIATE:
        return `Organization associate${resourcePart}`;
      case AuthorizationCredential.ORGANIZATION_ADMIN:
        return `Organization administrator${resourcePart}`;
      case AuthorizationCredential.ORGANIZATION_OWNER:
        return `Organization owner${resourcePart}`;
      case AuthorizationCredential.USER_SELF_MANAGEMENT:
        return `User self-management${resourcePart}`;
      case AuthorizationCredential.USER_GROUP_MEMBER:
        return `User group member${resourcePart}`;
      case AuthorizationCredential.ACCOUNT_ADMIN:
        return `Account administrator${resourcePart}`;
      case AuthorizationCredential.BETA_TESTER:
        return 'Beta tester access';
      case AuthorizationCredential.VC_CAMPAIGN:
        return 'Virtual contributor campaign access';
      default:
        return `${type}${resourcePart}`;
    }
  }
}
