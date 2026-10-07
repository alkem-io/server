import { CREDENTIAL_RULE_TYPES_PLATFORM_CONTENT_FULL_ACCESS } from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Platform } from '@platform/platform/platform.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PlatformAuthorizationPolicyService {
  private readonly rootAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {
    this.rootAuthorizationPolicy = this.createRootAuthorizationPolicy();
  }

  public async getPlatformAuthorizationPolicy(): Promise<IAuthorizationPolicy> {
    const platform = await this.platformRepository.findOne({
      where: {},
      relations: {
        authorization: true,
      },
    });

    if (!platform || !platform.authorization) {
      throw new EntityNotFoundException(
        'No Platform authorization found!',
        LogContext.PLATFORM
      );
    }
    return platform.authorization;
  }

  public inheritRootAuthorizationPolicy(
    childAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    return this.authorizationPolicyService.inheritParentAuthorization(
      childAuthorization,
      this.rootAuthorizationPolicy
    );
  }

  private createRootAuthorizationPolicy(): IAuthorizationPolicy {
    const rootAuthorization = new AuthorizationPolicy(
      AuthorizationPolicyType.PLATFORM
    );

    const credentialRules = this.createRootCredentialRules();

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      rootAuthorization,
      credentialRules
    );
  }

  private createRootCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];

    // 027-platform-role-redesign (T036, research D5/D6, FR-007(e), eleventh
    // analyze pass; REVERSED at the ninth `/speckit-analyze` pass — see
    // FR-004/SC-004, spec-server-1 fix): the replacement for the root
    // god-mode grant.
    //
    // SLICE B (T072): the `global-admin` CRUD+GRANT god-mode rule that stood
    // beside this one is GONE, and `global-admin` is gone from this rule's
    // own credential list. This is now the root policy's ONLY credential
    // rule, and `GRANT` has left the inheritance root entirely (research
    // D6) — no credential can grant anything by cascade; every assignment
    // capability is an explicit, per-family privilege from here on.
    //
    // Do not restore CREATE / UPDATE / DELETE onto any other credential
    // here: a blanket write cascade satisfies the OWNER branch of A6's and
    // A7's dual-path gates indistinguishably from the owner's own privilege
    // (FR-007(e)), which is exactly how the god mode reconstitutes itself.
    // `UPDATE_NAMEID` must likewise never join this list — A17 is owned by
    // NO global role. Both regressions now fail `reachability.spec.ts`
    // rather than surviving to a review pass.
    //
    // Content Full Access holds full CREATE/READ/UPDATE/DELETE cascaded from
    // the inheritance root, plus its own privilege. This is a DELIBERATE,
    // signed-off widening (ninth pass): a blanket write cascade satisfies
    // the OWNER branch of every dual-path gate this feature adds (A6
    // `DELETE ∨ DELETE_ORGANIZATION`, A7 `UPDATE ∨
    // PLATFORM_SUPPORT_ORG_RESOURCES`), so this role ALSO reaches Platform
    // Support's A6 (delete organization) and A7 (edit an organization's
    // packs/hubs) — accepted as SC-004's single named exception rather than
    // designed out (see `a.row.surfaces.ts`'s A6/A7 `acceptedExtraReachers`
    // entries, which keep the derivation honest about this).
    //
    // This is now the widest grant on the platform, and it is deliberately
    // NOT minimised — a scoped re-creation of part of the god mode, held by
    // one named role instead of by everyone who needed to do support work.
    // It holds NO role-assignment capability, which is the half that keeps
    // it from being the old god mode: Platform Roles Admin administers who
    // holds power and never what that power acts on; this role is the exact
    // mirror. Neither may drift toward the other.
    const contentFullAccess =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        ],
        [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
        CREDENTIAL_RULE_TYPES_PLATFORM_CONTENT_FULL_ACCESS
      );
    credentialRules.push(contentFullAccess);

    return credentialRules;
  }
}
