import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { isPlatformCredentialType } from '@core/actor-context/actor.context.service';
import { AuditInput, emitAudit } from '@core/auth/oidc/audit';
import { SecondFactorRequiredError } from '@core/auth/oidc/strategies/auth.errors';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { Organization } from '@domain/community/organization/organization.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { platformSecuritySettings } from '@platform/platform-settings/platform.settings.security.defaults';
import { In, Repository } from 'typeorm';

export const SECOND_FACTOR_GRACE_MS = 14 * 24 * 3600 * 1000;

const ORGANIZATION_ROLE_CREDENTIALS: ReadonlySet<string> = new Set([
  AuthorizationCredential.ORGANIZATION_OWNER,
  AuthorizationCredential.ORGANIZATION_ADMIN,
  AuthorizationCredential.ORGANIZATION_ASSOCIATE,
]);

export type SecondFactorCoverage = {
  covered: boolean;
  deadline: Date | null;
};

/**
 * Who a second-factor rule covers, and whether a sign-in is refused for it.
 * Rules are read from the database on every evaluation: a rule or credential
 * change is seen by the very next request. A failed read is not caught.
 */
@Injectable()
export class SecondFactorPolicyService {
  constructor(
    @InjectRepository(Platform)
    private readonly platformRepository: Repository<Platform>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>
  ) {}

  async coverage(
    credentials: ICredentialDefinition[]
  ): Promise<SecondFactorCoverage> {
    const switchedOnAt = [
      ...(await this.platformRuleSince(credentials)),
      ...(await this.organizationRulesSince(credentials)),
    ];
    if (switchedOnAt.length === 0) {
      return { covered: false, deadline: null };
    }
    return {
      covered: true,
      deadline: new Date(Math.min(...switchedOnAt) + SECOND_FACTOR_GRACE_MS),
    };
  }

  /**
   * Throws `SecondFactorRequiredError` when the actor's sign-in is refused.
   * Only an actor stamped by a sign-in strategy is evaluated.
   */
  async assertNotRefused(actor: ActorContext, now: Date): Promise<void> {
    if (!actor.secondFactor) return;
    const { covered, deadline } = await this.coverage(actor.credentials);
    if (
      covered &&
      !actor.secondFactor.satisfied &&
      deadline !== null &&
      now.getTime() >= deadline.getTime()
    ) {
      throw new SecondFactorRequiredError();
    }
  }

  private async platformRuleSince(
    credentials: ICredentialDefinition[]
  ): Promise<number[]> {
    if (!credentials.some(c => isPlatformCredentialType(c.type))) return [];
    const platform = await this.platformRepository.findOne({
      where: {},
      select: ['id', 'settings'],
      loadEagerRelations: false,
    });
    const rule = platformSecuritySettings(platform?.settings);
    if (!rule.secondFactorRequiredForPlatformRoles) return [];
    return [rule.secondFactorRequiredForPlatformRolesSince?.getTime() ?? 0];
  }

  private async organizationRulesSince(
    credentials: ICredentialDefinition[]
  ): Promise<number[]> {
    const organizationIds = [
      ...new Set(
        credentials
          .filter(c => ORGANIZATION_ROLE_CREDENTIALS.has(c.type))
          .map(c => c.resourceID)
      ),
    ];
    if (organizationIds.length === 0) return [];
    const organizations = await this.organizationRepository.find({
      where: { id: In(organizationIds) },
      select: ['id', 'settings'],
      loadEagerRelations: false,
    });
    return organizations
      .map(organization => organization.settings?.security)
      .filter(security => security?.secondFactorRequired === true)
      .map(security =>
        new Date(security?.secondFactorRequiredSince ?? 0).getTime()
      );
  }
}

/** `assertNotRefused` for a sign-in strategy: a refusal is audited, then rethrown. */
export async function assertSignInNotRefused(
  policy: Pick<SecondFactorPolicyService, 'assertNotRefused'>,
  actor: ActorContext,
  audit: Pick<AuditInput, 'sub' | 'client_id' | 'correlation_id' | 'request_id'>
): Promise<void> {
  try {
    await policy.assertNotRefused(actor, new Date());
  } catch (error) {
    if (error instanceof SecondFactorRequiredError) {
      emitAudit({
        event_type: 'auth.second_factor.refused',
        outcome: 'failure',
        ...audit,
        error_code: 'second_factor_required',
      });
    }
    throw error;
  }
}
