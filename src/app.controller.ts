import { ssiConfig } from '@config/ssi.config';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api/public/rest')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post(`${ssiConfig.endpoints.shareRequestedCredentialEndpoint}/:nonce`)
  async [ssiConfig.endpoints.shareRequestedCredentialEndpoint](
    @Param('nonce') nonce: string,
    @Body() payload: { token: string }
  ) {
    await this.appService.shareRequestedCredential(nonce, payload.token);
  }
}
