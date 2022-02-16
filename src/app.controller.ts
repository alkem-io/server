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

  @Post(`${ssiConfig.endpoints.completeCredentialShareInteraction}/:nonce`)
  async [ssiConfig.endpoints.completeCredentialShareInteraction](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    await this.appService.completeCredentialShareInteraction(
      nonce,
      payload.token
    );
    //TODO Once this completes publish the credential share complete with the interaction id to the client
  }
}
