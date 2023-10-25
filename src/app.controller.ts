import { RestEndpoint } from '@common/enums/rest.endpoint';
import { Controller, Get, Inject, LoggerService, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  GeoInformation,
  GeoLocationService,
} from '@services/external/geo-location';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

@Controller('/rest')
export class AppController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly geoLocationService: GeoLocationService
  ) {}

  @Get()
  getHello(): string {
    return 'Hello Alkemio!';
  }

  @Get(RestEndpoint.GEO_LOCATION)
  public async getGeo(
    @Req() req: Request
  ): Promise<GeoInformation | undefined> {
    const forwardedFor = req.headers['x-forwarded-for'];

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
