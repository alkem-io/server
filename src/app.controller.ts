import { RestEndpoint } from '@common/enums/rest.endpoint';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('/rest')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post(
    `${RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM}/:nonce`
  )
  async [RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    await this.appService.completeCredentialRequestInteractionJolocom(
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
    this.appService.completeCredentialRequestInteractionSovrhd(nonce, payload);
  }

  @Post(`${RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION}/:nonce`)
  async [RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    return await this.appService.completeCredentialOfferInteraction(
      nonce,
      payload.token
    );
    //TODO Once this completes publish the credential share complete with the interaction id to the client
  }
}
