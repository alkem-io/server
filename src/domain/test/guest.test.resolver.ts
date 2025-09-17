import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhoAmIDto } from './dto/who.am.i.dto';
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

    return {
      displayName,
      authenticationStatus,
      userID: agentInfo.userID,
      guestName: agentInfo.guestName,
      roles: [], // Roles would need to be derived from credentials in a real implementation
      credentials: agentInfo.credentials.map(cred => cred.type),
    };
  }
}
