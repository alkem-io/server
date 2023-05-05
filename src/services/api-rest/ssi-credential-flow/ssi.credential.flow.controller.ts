import {
  Body,
  Controller,
  HttpCode,
  Inject,
  LoggerService,
  Param,
  Post,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { SsiCredentialFlowService } from './ssi.credential.flow.service';

@Controller('/rest')
export class SsiCredentialFlowController {
  constructor(
    private ssiCredentialFlowService: SsiCredentialFlowService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}
  @Post(
    `${RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM}/:nonce`
  )
  async [RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    await this.ssiCredentialFlowService.completeCredentialRequestInteractionJolocom(
      nonce,
      payload.token
    );
    //TODO Once this completes publish the credential share complete with the interaction id to the client
  }

  @Post(`${RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD}/:nonce`)
  @HttpCode(200)
  async [RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD](
    @Param('nonce') nonce: string,
    @Body() payload: any
  ) {
    // try not awaiting...
    this.ssiCredentialFlowService.completeCredentialRequestInteractionSovrhd(
      nonce,
      payload
    );
  }

  @Post(`${RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION}/:nonce`)
  async [RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    return await this.ssiCredentialFlowService.completeCredentialOfferInteraction(
      nonce,
      payload.token
    );
    //TODO Once this completes publish the credential share complete with the interaction id to the client
  }
}
