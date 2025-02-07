import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICallout } from '../callout/callout.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutAuthorizationService } from '../callout/callout.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutService } from '../callout/callout.service';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { TransferCalloutInput } from './dto/callouts.set.dto.transfer.callout';
import { CalloutTransferService } from './callout.transfer.service';

@Resolver()
export class CalloutTransferResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private calloutService: CalloutService,
    private calloutTransferService: CalloutTransferService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description:
      'Transfer the specified Callout from its current CalloutsSet to the target CalloutsSet.',
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

    // Reset the authorization policy for the callout
    const authorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        callout.id,
        sourceCalloutsSet.authorization
      );

    await this.authorizationPolicyService.saveAll(authorizations);
    return this.calloutService.getCalloutOrFail(callout.id);
  }
}
