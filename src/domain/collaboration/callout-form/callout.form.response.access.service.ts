import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { RoleName } from '@common/enums/role.name';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { CalloutFormResponsesScope } from '../callout-form-response/dto/callout.form.responses.view';
import { ICalloutForm } from './callout.form.interface';

/**
 * The single owner of who may read Form responses. There is no stored policy
 * for a Form or a response: the read-all audience is derived from the CURRENT
 * credentials of the actor on every request, so a role change takes effect on
 * the next request and no authorization reset is ever needed.
 *
 * The callout passed in must carry `authorization` and, for the read-all path,
 * `calloutsSet.collaboration.space` with its `platformRolesAccess` and
 * `community.roleSet` (+ `calloutsSet.authorization` and `calloutsSet.type` for
 * moderation).
 */
@Injectable()
export class FormResponseAccessService {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roleSetService: RoleSetService,
    private platformRolesAccessService: PlatformRolesAccessService
  ) {}

  /**
   * ALL: every response. OWN: only the actor's own. NONE: anonymous.
   * Throws the standard forbidden error when the actor cannot read the Post
   * itself — the same gate as `lookup.callout`.
   */
  public async resolveScope(
    actorContext: ActorContext,
    form: ICalloutForm,
    callout: ICallout
  ): Promise<CalloutFormResponsesScope> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `read Form responses on callout: ${callout.id}`
    );

    const space = callout.calloutsSet?.collaboration?.space;
    const roleSet = space?.community?.roleSet;
    // No Space roleSet means no Space admin audience: fail closed (a rule
    // without criteria throws rather than denying).
    if (!space || !roleSet) {
      return actorContext.actorID ? 'OWN' : 'NONE';
    }

    // The Space admins, exactly as the Space defines them
    // (space.service.authorization.ts): the roleSet admins with parents, plus
    // every platform role this Space's stored platformRolesAccess grants
    // UPDATE — Platform Support where the Space lets it act as admin.
    const criteria: ICredentialDefinition[] = [
      ...(await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN
      )),
      ...this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        space.platformRolesAccess.roles,
        [AuthorizationPrivilege.UPDATE]
      ),
    ];
    if (form.visibility === CalloutFormResponseVisibility.MEMBERS) {
      criteria.push(
        await this.roleSetService.getCredentialForRole(roleSet, RoleName.MEMBER)
      );
    }

    const readAll = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      readAll,
      [
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ],
          criteria,
          'callout form responses read-all'
        ),
      ]
    );
    if (
      this.authorizationService.isAccessGranted(
        actorContext,
        readAll,
        AuthorizationPrivilege.READ
      )
    ) {
      return 'ALL';
    }
    return actorContext.actorID ? 'OWN' : 'NONE';
  }

  /**
   * Moderation (edit the definition, delete any response) is CREATE on the
   * CURRENT callouts set of the Post, on a COLLABORATION set only. It reads the
   * stored callouts set policy, which already carries the Space admins,
   * Platform Support included where the Space lets it act as admin.
   */
  public canModerate(actorContext: ActorContext, callout: ICallout): boolean {
    const calloutsSet = callout.calloutsSet;
    if (!calloutsSet || calloutsSet.type !== CalloutsSetType.COLLABORATION) {
      return false;
    }
    return this.authorizationService.isAccessGranted(
      actorContext,
      calloutsSet.authorization,
      AuthorizationPrivilege.CREATE
    );
  }

  public assertCanModerate(actorContext: ActorContext, callout: ICallout) {
    const calloutsSet = callout.calloutsSet;
    if (!calloutsSet || calloutsSet.type !== CalloutsSetType.COLLABORATION) {
      throw new ForbiddenAuthorizationPolicyException(
        `Authorization: unable to grant '${AuthorizationPrivilege.CREATE}' privilege: moderate Form on callout: ${callout.id} user: ${actorContext.actorID}`,
        AuthorizationPrivilege.CREATE,
        calloutsSet?.authorization?.id ?? '',
        actorContext.actorID
      );
    }
    this.authorizationService.grantAccessOrFail(
      actorContext,
      calloutsSet.authorization,
      AuthorizationPrivilege.CREATE,
      `moderate Form on callout: ${callout.id}`
    );
  }
}
