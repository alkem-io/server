import { RestEndpoint } from '@common/enums/rest.endpoint';
import { Controller, Get, Inject, LoggerService, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  GeoInformation,
  GeoLocationService,
} from '@services/external/geo-location';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';

@Controller('/rest')
export class AppController {
  private readonly header: string;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly geoLocationService: GeoLocationService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.header = this.configService.get('integrations.geo.header', {
      infer: true,
    });
  }

  @Get()
  getHello(): string {
    return 'Hello Alkemio!';
  }

  @Get(RestEndpoint.GEO_LOCATION)
  public async getGeo(
    @Req() req: Request
  ): Promise<GeoInformation | undefined> {
    this.logger.verbose?.(req.headers);
    const forwardedFor = req.headers[this.header]; // x-forwarded-proto

    if (!forwardedFor) {
      this.logger.error(
        'X-Forwarded-For header not set',
        undefined,
        LogContext.GEO
      );
      return undefined;
    }

    const ip = String(forwardedFor).split(',')?.[0];

    this.logger.verbose?.(`X-Forwarded-For header: ${forwardedFor}`);

    if (!ip) {
      this.logger.error(
        'Unable to get IP for header',
        undefined,
        LogContext.GEO
      );
      return undefined;
    }

    let geo: GeoInformation | undefined;

    try {
      geo = await this.geoLocationService.getGeo(ip);
    } catch (error: any) {
      this.logger.error(
        `Unable to fetch geo location for IP: ${ip} :: ${error?.message}`,
        error?.stack,
        LogContext.GEO
      );
    }

    return geo;
  }
}
