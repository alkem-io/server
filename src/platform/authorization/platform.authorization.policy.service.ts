import {
  CREDENTIAL_RULE_TYPES_PLATFORM_CONTENT_FULL_ACCESS,
  CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS,
} from '@common/constants';
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
    const globalAdmins =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    credentialRules.push(globalAdmins);

    // 027-platform-role-redesign (T036, research D5/D6, FR-007(e), eleventh
    // analyze pass; REVERSED at the ninth `/speckit-analyze` pass — see
    // FR-004/SC-004, spec-server-1 fix): the replacement for the root
    // god-mode grant, added ALONGSIDE it (removal is Slice B, T072 — never
    // narrow before the replacement grant exists).
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
    // entries, which keep the derivation honest about this). UPDATE_NAMEID
    // remains excluded: A17 is owned by NO global role (spec row 2,
    // FR-020), so cascading it would hand Content Full Access entity
    // renames the spec explicitly denies it.
    //
    // GLOBAL_SUPPORT is deliberately NOT a member of this credential list
    // (sec-server-3/corr-server-2 fix): unlike GLOBAL_ADMIN, global-support
    // never held blanket CRUD across the seven root-inheriting trees before
    // this feature — its pre-existing reach was (a) the platform-SUBTREE
    // cascade (`platform.service.authorization.ts`'s
    // `globalSupportPlatformAdmin`, which does not cover space / account /
    // user / organization / VC / assistant), and (b) per-space, FLAG-GATED
    // privileges via `settings.privacy.allowPlatformSupportAsAdmin`
    // (`space.service.platform.roles.access.ts`). Adding it here would grant
    // every global-support holder cascading READ + PLATFORM_CONTENT_FULL_ACCESS
    // over every space on the platform — including private ones — bypassing
    // that per-space opt-out for both reads and A8 deletions. Global-support
    // keeps everything it legitimately had through those two existing paths.
    const contentFullAccess =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
        ],
        [
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
          AuthorizationCredential.GLOBAL_ADMIN,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_CONTENT_FULL_ACCESS
      );
    credentialRules.push(contentFullAccess);

    return credentialRules;
  }
}
