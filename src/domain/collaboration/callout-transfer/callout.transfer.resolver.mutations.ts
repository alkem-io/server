import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICallout } from '../callout/callout.interface';
import { CalloutService } from '../callout/callout.service';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { CollaborationLicenseService } from '../collaboration/collaboration.service.license';
import { CalloutTransferService } from './callout.transfer.service';
import { TransferCalloutInput } from './dto/callouts.set.dto.transfer.callout';

@InstrumentResolver()
@Resolver()
export class CalloutTransferResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private calloutService: CalloutService,
    private calloutTransferService: CalloutTransferService,
    private roomResolverService: RoomResolverService,
    private collaborationLicenseService: CollaborationLicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ICallout, {
    description:
      'Transfer the specified Callout from its current CalloutsSet to the target CalloutsSet. Note: this is experimental, and only for GlobalAdmins. The user that executes the transfer becomes the creator of the Callout.',
  })
  async transferCallout(
    @CurrentActor() actorContext: ActorContext,
    @Args('transferData')
    transferData: TransferCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      transferData.calloutID,
      {
        relations: {
          calloutsSet: true,
        },
      }
    );
    const sourceCalloutsSet = callout.calloutsSet;
    if (!sourceCalloutsSet) {
      throw new RelationshipNotFoundException(
        `Unable to load CalloutsSet on callout:  ${callout.id} `,
        LogContext.COLLABORATION
      );
    }
    if (callout.isTemplate) {
      throw new ValidationException(
        `Cannot transfer a template callout: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }
    const targetCalloutsSet =
      await this.calloutsSetService.getCalloutsSetOrFail(
        transferData.targetCalloutsSetID
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      sourceCalloutsSet.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER,
      `callouts set transfer callout: ${callout.id}`
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      targetCalloutsSet.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
      `callouts set transfer callout: ${callout.id}`
    );

    // Office Docs entitlement gate (FR-001/FR-004/FR-006/FR-009): transfer is an
    // introduction path. If the source Callout has Collabora framing or allows
    // Collabora contributions, the target's Collaboration license governs (FR-006).
    if (this.calloutIntroducesCollaboraDocument(callout)) {
      await this.collaborationLicenseService.ensureOfficeDocsAllowedForCalloutsSet(
        targetCalloutsSet.id
      );
    }

    // Transfer is authorized, now try to execute it
    await this.calloutTransferService.transferCallout(
      callout,
      targetCalloutsSet
    );

    const { platformRolesAccess } =
      await this.roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout(
        callout.id
      );

    // Reset the authorization policy for the callout
    const authorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout.id,
        targetCalloutsSet.authorization,
        platformRolesAccess
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.calloutService.getCalloutOrFail(callout.id);
  }

  /**
   * Detects whether a source Callout introduces a Collabora Document — by framing
   * type or by allowing Collabora Document contributions — for Office Docs gating
   * (FR-004).
   */
  private calloutIntroducesCollaboraDocument(callout: ICallout): boolean {
    if (callout.framing?.type === CalloutFramingType.COLLABORA_DOCUMENT) {
      return true;
    }
    const allowedTypes = callout.settings?.contribution?.allowedTypes;
    if (
      Array.isArray(allowedTypes) &&
      allowedTypes.includes(CalloutContributionType.COLLABORA_DOCUMENT)
    ) {
      return true;
    }
    return false;
  }
}
