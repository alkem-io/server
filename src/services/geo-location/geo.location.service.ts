import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { Cache } from 'cache-manager';
import { GeoLocationCacheMetadata } from '@services/geo-location/geo.location.cache.metadata';
import {
  GeoServiceErrorException,
  GeoServiceLimitReachedException,
  GeoServiceNotAvailableException,
} from '@common/exceptions/geo';
import { LogContext } from '@common/enums';
import { GeoInformation } from './geo.information';
import { GeoPluginResponse } from './geo.plugin.response';

const endpoint = 'http://www.geoplugin.net/json.gp?ip=';
const cacheEntryTtl = 14400; // 4 hours
const geoServiceCallsKey = 'geo-service-call-limit';
// https://www.geoplugin.com/faq#i_stopped_getting_responses_from_geoplugin.net
// the free lookup limit of 120 requests per minute.
const allowedCallsToService = 120;
const allowedCallsToServiceWindow = 60;

@Injectable()
export class GeoLocationService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly httpService: HttpService
  ) {}

  public async getGeo(ip: string): Promise<GeoInformation | undefined> {
    const userGeoCached = await this.cacheManager.get<GeoInformation>(ip);

    if (userGeoCached) {
      return userGeoCached;
    }

    if (!(await this.canCallService())) {
      throw new GeoServiceLimitReachedException(
        `3rd party service limit of ${allowedCallsToService} calls per ${allowedCallsToServiceWindow} seconds reached`,
        LogContext.UNSPECIFIED
      );
    }

    const response = await this.httpService
      .get<GeoPluginResponse>(`${endpoint}${ip}`)
      .toPromise()
      .catch((err: AxiosError) => {
        return err;
      });

    if (!response) {
      throw new GeoServiceNotAvailableException(
        `3rd party service at (${endpoint}) not available`,
        LogContext.UNSPECIFIED
      );
    }

    if (response instanceof Error) {
      throw new GeoServiceErrorException(
        `3rd party service returned an error: ${response.message}`,
        LogContext.UNSPECIFIED
      );
    }

    const userGeo: GeoInformation = {
      latitude: Number(response.data.geoplugin_latitude),
      longitude: Number(response.data.geoplugin_longitude),
    };

    this.cacheManager.set<GeoInformation>(ip, userGeo, {
      ttl: cacheEntryTtl,
    });

    return userGeo;
  }

  private async canCallService(): Promise<boolean> {
    const cacheMetadata = await this.cacheManager.get<GeoLocationCacheMetadata>(
      geoServiceCallsKey
    );

    if (
      !cacheMetadata ||
      Date.now() - cacheMetadata.start > allowedCallsToServiceWindow * 1000
    ) {
      this.cacheManager.set<GeoLocationCacheMetadata>(
        geoServiceCallsKey,
        {
          start: Date.now(),
          calls: 1,
        },
        { ttl: allowedCallsToServiceWindow }
      );
      return true;
    }

    const { calls, start } = cacheMetadata;

    if (calls === allowedCallsToService) {
      return false;
    }

    this.cacheManager.set<GeoLocationCacheMetadata>(
      geoServiceCallsKey,
      {
        start,
        calls: calls + 1,
      },
      { ttl: allowedCallsToServiceWindow }
    );

    return true;
  }
}
