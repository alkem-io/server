import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { WhiteboardService } from './whiteboard.service';
import { IWhiteboard } from './whiteboard.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '../authorization-policy';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ISpace } from '@domain/space/space/space.interface';
import {
  EntityNotInitializedException,
  ForbiddenException,
} from '@common/exceptions';

const WHITEBOARD_GUEST_RULE_NAME = 'whiteboard-guest-access';
const REQUIRED_GUEST_PRIVILEGES: AuthorizationPrivilege[] = [
  AuthorizationPrivilege.READ,
  AuthorizationPrivilege.UPDATE_CONTENT,
  AuthorizationPrivilege.CONTRIBUTE,
];

@Injectable()
export class WhiteboardGuestAccessService {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly communityResolverService: CommunityResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async updateGuestAccess(
    agentInfo: AgentInfo,
    whiteboardId: string,
    guestAccessEnabled: boolean
  ): Promise<IWhiteboard> {
    this.logger.verbose?.('Requested whiteboard guest access toggle', {
      whiteboardId,
      guestAccessEnabled,
      userId: agentInfo.userID,
      context: LogContext.COLLABORATION,
    });
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardId,
      {
        loadEagerRelations: false,
        relations: {
          authorization: true,
        },
        select: {
          id: true,
          authorization:
            this.authorizationPolicyService.authorizationSelectOptions,
        },
      }
    );

    const authorization = this.ensureAuthorization(whiteboard);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.PUBLIC_SHARE,
      `toggle guest access on whiteboard: ${whiteboard.id}`
    );

    const space = await this.resolveSpaceForWhiteboardOrFail(whiteboardId);

    if (guestAccessEnabled && !this.isGuestToggleAllowed(space)) {
      throw new ForbiddenException(
        'Guest contributions are disabled for the space',
        LogContext.COLLABORATION,
        {
          spaceId: space.id,
          whiteboardId,
          userId: agentInfo.userID,
        }
      );
    }

    const authorizationChanged = guestAccessEnabled
      ? this.enableGuestAccess(authorization)
      : this.disableGuestAccess(authorization);

    if (authorizationChanged) {
      await this.authorizationPolicyService.save(authorization);
      this.logger.verbose?.('Persisted whiteboard guest access change', {
        whiteboardId,
        guestAccessEnabled,
        context: LogContext.COLLABORATION,
      });
    } else {
      this.logger.debug?.(
        'Guest access toggle requested but authorization unchanged',
        {
          whiteboardId,
          guestAccessEnabled,
          context: LogContext.COLLABORATION,
        }
      );
    }

    const guestAccessActive = this.isGuestAccessEnabled(authorization);
    whiteboard.guestContributionsAllowed = guestAccessActive;
    return whiteboard;
  }

  public isGuestAccessEnabled(
    authorization: IAuthorizationPolicy | undefined
  ): boolean {
    if (!authorization) {
      return false;
    }

    return authorization.credentialRules.some(rule =>
      this.ruleTargetsGuestCredential(rule)
    );
  }

  private ensureAuthorization(whiteboard: IWhiteboard): IAuthorizationPolicy {
    if (!whiteboard.authorization) {
      throw new EntityNotInitializedException(
        `Authorization not initialized for whiteboard: ${whiteboard.id}`,
        LogContext.COLLABORATION
      );
    }

    return whiteboard.authorization;
  }

  private ruleTargetsGuestCredential(
    rule: IAuthorizationPolicyRuleCredential
  ): boolean {
    return rule.criterias.some(
      criteria => criteria.type === AuthorizationCredential.GLOBAL_GUEST
    );
  }

  private enableGuestAccess(authorization: IAuthorizationPolicy): boolean {
    const existingRule = this.findGuestRule(authorization);
    if (!existingRule) {
      const newRule: IAuthorizationPolicyRuleCredential = {
        name: WHITEBOARD_GUEST_RULE_NAME,
        cascade: true,
        criterias: [
          {
            type: AuthorizationCredential.GLOBAL_GUEST,
            resourceID: '',
          },
        ],
        grantedPrivileges: [...REQUIRED_GUEST_PRIVILEGES],
      };
      authorization.credentialRules.push(newRule);
      return true;
    }

    const previousPrivileges = new Set(existingRule.grantedPrivileges);
    let mutated = false;

    for (const privilege of REQUIRED_GUEST_PRIVILEGES) {
      if (!previousPrivileges.has(privilege)) {
        existingRule.grantedPrivileges.push(privilege);
        mutated = true;
      }
    }

    if (!existingRule.cascade) {
      existingRule.cascade = true;
      mutated = true;
    }

    if (existingRule.name !== WHITEBOARD_GUEST_RULE_NAME) {
      existingRule.name = WHITEBOARD_GUEST_RULE_NAME;
      mutated = true;
    }

    return mutated;
  }

  private disableGuestAccess(authorization: IAuthorizationPolicy): boolean {
    const originalLength = authorization.credentialRules.length;
    authorization.credentialRules = authorization.credentialRules.filter(
      rule => !this.ruleTargetsGuestCredential(rule)
    );
    return authorization.credentialRules.length !== originalLength;
  }

  private findGuestRule(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential | undefined {
    return authorization.credentialRules.find(rule =>
      this.ruleTargetsGuestCredential(rule)
    );
  }

  private async resolveSpaceForWhiteboardOrFail(
    whiteboardId: string
  ): Promise<ISpace> {
    const community =
      await this.communityResolverService.getCommunityFromWhiteboardOrFail(
        whiteboardId
      );
    return this.communityResolverService.getSpaceForCommunityOrFail(
      community.id
    );
  }

  private isGuestToggleAllowed(space: ISpace): boolean {
    return space.settings?.collaboration?.allowGuestContributions === true;
  }
}
