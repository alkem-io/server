import { ssiConfig } from '@config/ssi.config';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('/rest')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post(`${ssiConfig.endpoints.completeCredentialRequestInteraction}/:nonce`)
  async [ssiConfig.endpoints.completeCredentialRequestInteraction](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    await this.appService.completeCredentialRequestInteraction(
      nonce,
      payload.token
    );
    //TODO Once this completes publish the credential share complete with the interaction id to the client
  }

  @Post(`${ssiConfig.endpoints.completeCredentialOfferInteraction}/:nonce`)
  async [ssiConfig.endpoints.completeCredentialOfferInteraction](
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
