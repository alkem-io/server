import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { LogContext } from '@common/enums';
import { GeoLocation } from './geo.location';
import { GeoapifyGeocodeResponse } from './geoapify.geocode.response';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AlkemioConfig } from '@src/types';
import { firstValueFrom } from 'rxjs';

const EMPTY_GEO_LOCATION: GeoLocation = {
  longitude: 0,
  latitude: 0,
};

@Injectable()
export class GeoapifyService {
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const config = this.configService.get('integrations.geoapify', {
      infer: true,
    });
    this.endpoint = config.geocode_rest_endpoint;
    this.apiKey = config.api_key;
  }

  public async getGeoapifyGeocodeLocation(
    country: string | undefined,
    city: string | undefined
  ): Promise<GeoLocation | undefined> {
    if (!country) {
      return EMPTY_GEO_LOCATION;
    }

    if (!country?.trim() && !city?.trim()) {
      this.logger.verbose?.(
        `Ignoring lookup with values '${city}', ${country}`,
        LogContext.GEO
      );
      return EMPTY_GEO_LOCATION;
    }
    let searchText = '';
    if (country) {
      searchText = country;
      if (city) {
        searchText = `${city}, ${country}`;
      }
    } else if (city) {
      searchText = city;
    }
    const params = {
      text: searchText,
      apiKey: this.apiKey,
    };
    try {
      const response = await firstValueFrom(
        this.httpService.get<GeoapifyGeocodeResponse>(this.endpoint, {
          headers: { Accept: 'application/json' },
          params,
        })
      );
      const data = response.data;
      const firstFeature = data.features?.[0];
      if (!firstFeature) {
        this.logger.error(
          `Search term '${searchText}' resulted in no results: ${JSON.stringify(data)}`,
          LogContext.GEO
        );
        return EMPTY_GEO_LOCATION;
      }
      const properties = firstFeature.properties;
      const longitude = properties.lon;
      const latitude = properties.lat;
      const result: GeoLocation = {
        longitude,
        latitude,
      };
      this.logger.verbose?.(
        `Search term '${searchText}' resulted in location: longitude=${longitude}, latitude=${latitude}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Unexpected error on searching for '${searchText}': `,
        error,
        JSON.stringify(error),
        LogContext.GEO
      );
      return EMPTY_GEO_LOCATION;
    }
  }
}
