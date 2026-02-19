import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => ICallout, {
    description:
      'Transfer the specified Callout from its current CalloutsSet to the target CalloutsSet. Note: this is experimental, and only for GlobalAdmins. The user that executes the transfer becomes the creator of the Callout.',
  })
  async transferCallout(
    @CurrentUser() agentInfo: AgentInfo,
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
      agentInfo,
      sourceCalloutsSet.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE_OFFER,
      `callouts set transfer callout: ${callout.id}`
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      targetCalloutsSet.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE_ACCEPT,
      `callouts set transfer callout: ${callout.id}`
    );

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
}
