import { LogContext } from '@common/enums';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { GeoLocation } from './geo.location';
import { GeoapifyGeocodeResponse } from './geoapify.geocode.response';

countries.registerLocale(enLocale);

@Injectable()
export class GeoapifyService {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

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
    this.enabled = this.configService.get('integrations.geoapify.enabled', {
      infer: true,
    });
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async getGeoapifyGeocodeLocation(
    countryInput: string,
    city: string | undefined
  ): Promise<GeoLocation | undefined> {
    if (!this.enabled) {
      return undefined;
    }
    if (!countryInput || countryInput.length === 0) {
      return undefined;
    }

    const country = this.resolveCountryName(countryInput || '');

    let searchText = country;
    if (city) {
      searchText = `${city}, ${country}`;
    }

    const params = {
      text: searchText,
      apiKey: this.apiKey,
    };
    try {
      const httpResponse = this.httpService.get<GeoapifyGeocodeResponse>(
        this.endpoint,
        {
          headers: { Accept: 'application/json' },
          params,
        }
      );
      const response = await firstValueFrom(httpResponse);

      const data = response.data;
      const firstFeature = data.features?.[0];
      if (!firstFeature) {
        this.logger.error(
          `Search term '${searchText}' resulted in no results: ${JSON.stringify(data)}`,
          LogContext.GEO
        );
        return undefined;
      }
      const properties = firstFeature.properties;
      const longitude = properties.lon;
      const latitude = properties.lat;
      const result: GeoLocation = {
        longitude,
        latitude,
      };
      this.logger.verbose?.(
        `Search term '${searchText}' resulted in location: longitude=${longitude}, latitude=${latitude}`,
        LogContext.GEO
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Unexpected error on searching for '${searchText}': `,
        error,
        JSON.stringify(error),
        LogContext.GEO
      );
      return undefined;
    }
  }

  private resolveCountryName(codeOrName: string): string {
    if (!codeOrName) return '';
    const code = codeOrName.trim().toUpperCase();
    // Try ISO-2 and ISO-3
    const name = countries.getName(code, 'en');
    return name || codeOrName;
  }
}
