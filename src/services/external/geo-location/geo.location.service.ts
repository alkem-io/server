import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
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
    private readonly configService: ConfigService
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

    if (!(await this.canCallService())) {
      throw new GeoServiceRequestLimitExceededException(
        `3rd party service limit of ${this.allowedCallsToService} calls per ${this.allowedCallsToServiceWindow} seconds reached`,
        LogContext.GEO
      );
    }

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

    this.cacheManager.set<GeoInformation>(ip, userGeo, {
      ttl: this.cacheEntryTtl,
    });

    return userGeo;
  }

  private async canCallService(): Promise<boolean> {
    const cacheMetadata = await this.cacheManager.get<GeoLocationCacheMetadata>(
      geoServiceCallsKey
    );

    if (
      !cacheMetadata ||
      Date.now() - cacheMetadata.start > this.allowedCallsToServiceWindow * 1000
    ) {
      this.cacheManager.set<GeoLocationCacheMetadata>(
        geoServiceCallsKey,
        {
          start: Date.now(),
          calls: 1,
        },
        { ttl: this.allowedCallsToServiceWindow }
      );
      return true;
    }

    const { calls, start } = cacheMetadata;

    if (calls === this.allowedCallsToService) {
      return false;
    }

    this.cacheManager.set<GeoLocationCacheMetadata>(
      geoServiceCallsKey,
      {
        start,
        calls: calls + 1,
      },
      { ttl: this.allowedCallsToServiceWindow }
    );

    return true;
  }
}
