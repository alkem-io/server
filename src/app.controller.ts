import { RestEndpoint } from '@common/enums/rest.endpoint';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  LoggerService,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  GeoInformation,
  GeoLocationService,
} from '@services/external/geo-location';
import { AppService } from './app.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseException } from '@common/exceptions/base.exception';
import { ElasticsearchService } from '@services/external/elasticsearch/elasticsearch.service';

@Controller('/rest')
export class AppController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly appService: AppService,
    private readonly geoLocationService: GeoLocationService,
    private readonly e: ElasticsearchService
  ) {}

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

  @Get(RestEndpoint.GEO_LOCATION)
  public async getGeo(
    @Req() req: Request
  ): Promise<GeoInformation | undefined> {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (!forwardedFor) {
      this.logger.error('X-Forwarded-For header not set');
      return undefined;
    }

    const ip = String(forwardedFor).split(',')?.[0];

    this.logger.verbose?.(`X-Forwarded-For header: ${forwardedFor}`);

    if (!ip) {
      this.logger.error('Unable to get IP for header');
      return undefined;
    }

    let geo: GeoInformation | undefined;

    try {
      geo = await this.geoLocationService.getGeo(ip);
    } catch (error) {
      this.logger.error(
        `Unable to fetch geo location for IP: ${ip} :: ${
          (error as BaseException)?.message
        }`
      );
    }

    return geo;
  }
}
