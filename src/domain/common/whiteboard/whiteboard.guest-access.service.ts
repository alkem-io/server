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
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { ProfileAuthorizationService } from '../profile/profile.service.authorization';

const PUBLIC_RULE_NAME = 'public-access';
const GRANTED_GUEST_PRIVILEGES: AuthorizationPrivilege[] = [
  AuthorizationPrivilege.READ,
  AuthorizationPrivilege.UPDATE_CONTENT,
  AuthorizationPrivilege.CONTRIBUTE,
] as const;

const createGuestAccessCredentialRule = () =>
  new AuthorizationPolicyRuleCredential(
    GRANTED_GUEST_PRIVILEGES,
    [
      {
        type: AuthorizationCredential.GLOBAL_GUEST,
        resourceID: '',
      },
      {
        type: AuthorizationCredential.GLOBAL_REGISTERED,
        resourceID: '',
      },
    ],
    PUBLIC_RULE_NAME,
    true
  );

@Injectable()
export class WhiteboardGuestAccessService {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly communityResolverService: CommunityResolverService,
    private readonly profileAuthService: ProfileAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public getGuestAccessCredentialRule(): IAuthorizationPolicyRuleCredential {
    return this.cloneCredentialRule(createGuestAccessCredentialRule());
  }

  async updateGuestAccess(
    agentInfo: AgentInfo,
    whiteboardId: string,
    guestAccessEnabled: boolean
  ): Promise<IWhiteboard> {
    const baseLogMeta = this.buildLogMetadata(agentInfo, whiteboardId, {
      guestAccessEnabled,
    });
    this.logger.debug?.(
      'Whiteboard guest access toggle requested',
      baseLogMeta
    );
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardId,
      {
        loadEagerRelations: false,
        relations: {
          authorization: true,
          profile: true,
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
      this.logger.debug?.(
        'Whiteboard guest access toggle rejected: space disallows guest contributions',
        this.buildLogMetadata(agentInfo, whiteboardId, {
          guestAccessEnabled,
          spaceId: space.id,
        })
      );
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
      this.logger.debug?.('Persisted whiteboard guest access change', {
        ...baseLogMeta,
        authorizationChanged,
        persisted: true,
      });
    } else {
      this.logger.debug?.(
        'Guest access toggle requested but authorization unchanged',
        {
          ...baseLogMeta,
          authorizationChanged,
          persisted: false,
        }
      );
    }

    const guestAccessActive = this.isGuestAccessEnabled(authorization);
    const hydratedWhiteboard =
      await this.whiteboardService.getWhiteboardOrFail(whiteboardId);

    hydratedWhiteboard.guestContributionsAllowed = guestAccessActive;
    this.logger.debug?.('Whiteboard guest access toggle resolved', {
      ...baseLogMeta,
      authorizationChanged,
      guestAccessActive,
    });

    const profileAuthorizations =
      await this.profileAuthService.applyAuthorizationPolicy(
        whiteboard.profile.id,
        whiteboard.authorization
      );
    await this.authorizationPolicyService.saveAll(profileAuthorizations);
    return hydratedWhiteboard;
  }

  public isGuestAccessEnabled(
    authorization: IAuthorizationPolicy | undefined
  ): boolean {
    if (!authorization) {
      return false;
    }

    const guestRules = authorization.credentialRules.filter(rule =>
      this.ruleTargetsGuestCredential(rule)
    );

    if (guestRules.length === 0) {
      return false;
    }

    const allGrantedPrivileges = new Set(
      guestRules.flatMap(rule => rule.grantedPrivileges)
    );

    return GRANTED_GUEST_PRIVILEGES.every(privilege =>
      allGrantedPrivileges.has(privilege)
    );
  }

  private ensureAuthorization(whiteboard: IWhiteboard): IAuthorizationPolicy {
    if (!whiteboard.authorization) {
      throw new EntityNotInitializedException(
        'Authorization not initialized for whiteboard',
        LogContext.COLLABORATION,
        {
          whiteboardId: whiteboard.id,
        }
      );
    }

    return whiteboard.authorization;
  }

  private ruleTargetsGuestCredential(
    rule: IAuthorizationPolicyRuleCredential
  ): boolean {
    return this.ruleTargetsCredentialType(
      rule,
      AuthorizationCredential.GLOBAL_GUEST
    );
  }

  private ruleTargetsCredentialType(
    rule: IAuthorizationPolicyRuleCredential,
    credentialType: AuthorizationCredential
  ): boolean {
    return rule.criterias.some(criteria => criteria.type === credentialType);
  }

  private enableGuestAccess(authorization: IAuthorizationPolicy): boolean {
    const guestRuleChanged = this.ensureCredentialRule(
      authorization,
      PUBLIC_RULE_NAME,
      createGuestAccessCredentialRule()
    );

    return guestRuleChanged;
  }

  private disableGuestAccess(authorization: IAuthorizationPolicy): boolean {
    const originalLength = authorization.credentialRules.length;
    authorization.credentialRules = authorization.credentialRules.filter(
      rule => !this.shouldRemoveGuestAccessRule(rule)
    );
    return authorization.credentialRules.length !== originalLength;
  }

  private shouldRemoveGuestAccessRule(
    rule: IAuthorizationPolicyRuleCredential
  ): boolean {
    if (rule.name === PUBLIC_RULE_NAME) {
      return true;
    }

    return (
      !rule.name &&
      this.ruleTargetsCredentialType(rule, AuthorizationCredential.GLOBAL_GUEST)
    );
  }

  private ensureCredentialRule(
    authorization: IAuthorizationPolicy,
    ruleName: string,
    ruleTemplate: IAuthorizationPolicyRuleCredential
  ): boolean {
    const existingRule = this.findRuleByName(authorization, ruleName);
    if (!existingRule) {
      authorization.credentialRules.push(
        this.cloneCredentialRule(ruleTemplate)
      );
      return true;
    }

    let mutated = false;
    const previousPrivileges = new Set(existingRule.grantedPrivileges);

    for (const privilege of ruleTemplate.grantedPrivileges) {
      if (!previousPrivileges.has(privilege)) {
        existingRule.grantedPrivileges.push(privilege);
        mutated = true;
      }
    }

    if (ruleTemplate.cascade && !existingRule.cascade) {
      existingRule.cascade = true;
      mutated = true;
    }

    if (existingRule.name !== ruleName) {
      existingRule.name = ruleName;
      mutated = true;
    }

    return mutated;
  }

  private findRuleByName(
    authorization: IAuthorizationPolicy,
    ruleName: string
  ): IAuthorizationPolicyRuleCredential | undefined {
    return authorization.credentialRules.find(rule => rule.name === ruleName);
  }

  private cloneCredentialRule(
    rule: IAuthorizationPolicyRuleCredential
  ): IAuthorizationPolicyRuleCredential {
    return {
      ...rule,
      grantedPrivileges: [...rule.grantedPrivileges],
      criterias: rule.criterias.map(criteria => ({ ...criteria })),
    };
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

  private buildLogMetadata(
    agentInfo: AgentInfo,
    whiteboardId: string,
    extra?: Record<string, unknown>
  ) {
    const metadata = {
      whiteboardId,
      userId:
        agentInfo.userID || (agentInfo.isAnonymous ? 'anonymous' : 'unknown'),
      actorId: agentInfo.agentID || agentInfo.userID || 'unknown',
      context: LogContext.COLLABORATION,
    };

    return extra ? { ...metadata, ...extra } : metadata;
  }
}
