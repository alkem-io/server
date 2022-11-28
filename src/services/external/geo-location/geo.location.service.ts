import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { Cache } from 'cache-manager';
import { GeoLocationCacheMetadata } from '@services/external/geo-location/geo.location.cache.metadata';
import {
  GeoServiceErrorException,
  GeoServiceRequestLimitExceededException,
  GeoServiceNotAvailableException,
} from '@common/exceptions/geo';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { GeoInformation } from './geo.information';
import { GeoPluginResponse } from './geo.plugin.response';
import { isLimitExceeded } from './utils/is.limit.exceeded';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const geoServiceCallsKey = 'geo-service-call-limit';

@Injectable()
export class GeoLocationService {
  private readonly endpoint: string;
  private readonly allowedCallsToService: number;
  private readonly allowedCallsToServiceWindow: number;
  private readonly cacheEntryTtl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const config = configService.get(ConfigurationTypes.INTEGRATIONS)?.geo;
    this.endpoint = config.service_endpoint;
    this.allowedCallsToService = config.allowed_calls_to_service;
    this.allowedCallsToServiceWindow = config.allowed_calls_to_service_window;
    this.cacheEntryTtl = config.cache_entry_ttl;
  }

  public async getGeo(ip: string): Promise<GeoInformation | undefined> {
    const userGeoCached = await this.cacheManager.get<GeoInformation>(ip);

    if (userGeoCached) {
      return userGeoCached;
    }

    const cacheMetadata =
      (await this.getCacheMetadata()) ?? (await this.setCacheMedata());

    if (isLimitExceeded(cacheMetadata, this.allowedCallsToService)) {
      throw new GeoServiceRequestLimitExceededException(
        `3rd party service limit of ${this.allowedCallsToService} calls per ${this.allowedCallsToServiceWindow} seconds reached`,
        LogContext.GEO
      );
    }

    this.incrementCacheMetadata(cacheMetadata);

    this.logger.verbose?.(`Getting coordinates for ip: ${ip}`);
    const response = await this.httpService
      .get<GeoPluginResponse>(`${this.endpoint}${ip}`)
      .toPromise()
      .catch((err: AxiosError) => {
        return err;
      });

    if (!response) {
      throw new GeoServiceNotAvailableException(
        `3rd party service at (${this.endpoint}) not available`,
        LogContext.GEO
      );
    }

    if (response instanceof Error) {
      throw new GeoServiceErrorException(
        `3rd party service returned an error: ${response.message}`,
        LogContext.GEO
      );
    }

    const userGeo: GeoInformation = {
      latitude: Number(response.data.geoplugin_latitude),
      longitude: Number(response.data.geoplugin_longitude),
    };

    this.logger.verbose?.(
      `Coordinates for ip: ${ip}: longitude: ${userGeo.longitude} latitude: ${userGeo.latitude}`
    );

    this.cacheManager.set<GeoInformation>(ip, userGeo, {
      ttl: this.cacheEntryTtl,
    });

    return userGeo;
  }

  public getCacheMetadata() {
    return this.cacheManager.get<GeoLocationCacheMetadata>(geoServiceCallsKey);
  }

  private setCacheMedata() {
    return this.cacheManager.set<GeoLocationCacheMetadata>(
      geoServiceCallsKey,
      {
        start: Date.now(),
        calls: 1,
      },
      { ttl: this.allowedCallsToServiceWindow }
    );
  }

  private incrementCacheMetadata({ calls, start }: GeoLocationCacheMetadata) {
    return this.cacheManager.set<GeoLocationCacheMetadata>(
      geoServiceCallsKey,
      {
        start,
        calls: calls + 1,
      },
      { ttl: this.allowedCallsToServiceWindow }
    );
  }
}
