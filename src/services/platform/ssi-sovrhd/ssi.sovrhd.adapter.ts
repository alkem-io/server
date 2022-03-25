import { ConfigurationTypes, LogContext } from '@common/enums';
import { SsiSovrhdApiError } from '@common/exceptions/ssi.sovrhd.api.exception';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { lastValueFrom, map } from 'rxjs';
import { SsiSovrhdRegisterResponse } from './dto/ssi.sovrhd.dto.register.response';

@Injectable()
export class SsiSovrhdAdapter {
  private sovrhdApiEndpoint: string;
  private PATH_REGISTER = 'register';
  private PATH_API = 'api';
  private axiosOptions = {
    timeout: 5000,
    maxRedirects: 5,
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    const sovrhdConfig = this.configService.get(ConfigurationTypes.SSI)?.issuers
      ?.sovrhd;
    this.sovrhdApiEndpoint = sovrhdConfig.endpoint;
  }

  async establishSession(
    callbackURL: string
  ): Promise<SsiSovrhdRegisterResponse> {
    this.logger.verbose?.(
      `Establishing session with callback hook: ${callbackURL}`,
      LogContext.SSI
    );
    // Todo: retrieve the session ID properly
    const registerURL = `${this.sovrhdApiEndpoint}/${this.PATH_REGISTER}`;
    this.logger.verbose?.(
      `Registering session to: ${registerURL}`,
      LogContext.SSI
    );
    const sessionInitiationOptions = {
      webhook: callbackURL,
    };

    const sovrhdResponseData: SsiSovrhdRegisterResponse = await lastValueFrom(
      this.httpService
        .post(registerURL, sessionInitiationOptions, this.axiosOptions)
        .pipe(map(resp => resp.data))
    );
    if (!sovrhdResponseData.session) {
      throw new SsiSovrhdApiError(
        `Interaction with Sovrhd api failed: no session response: ${JSON.stringify(
          sovrhdResponseData
        )}`,
        LogContext.SSI
      );
    }
    this.logger.verbose?.(
      `Sovrhd session initiated: ${JSON.stringify(sovrhdResponseData)}`,
      LogContext.SSI
    );
    return sovrhdResponseData;
  }
}
