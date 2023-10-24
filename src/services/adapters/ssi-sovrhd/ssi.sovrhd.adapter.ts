import { ConfigurationTypes, LogContext } from '@common/enums';
import { SsiSovrhdApiException } from '@common/exceptions/ssi.sovrhd.api.exception';
import { SsiSovrhdCredentialRequestFailure } from '@common/exceptions/ssi.sovrhd.credential.request.failure';
import { SsiSovrhdCredentialTypeNotFoundException } from '@common/exceptions/ssi.sovrhd.credential.type.not.found.exception';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { lastValueFrom, map } from 'rxjs';
import { SsiSovrhdRegister } from './dto/ssi.sovrhd.dto.register';
import { SsiSovrhdRegisterCallbackCredential } from './dto/ssi.sovrhd.dto.register.callback.credential';
import { SsiSovrhdRegisterResponse } from './dto/ssi.sovrhd.dto.register.response';
import { SsiSovrhdRequest } from './dto/ssi.sovrhd.dto.request';
import { SsiSovrhdRequestResponse } from './dto/ssi.sovrhd.dto.request.response';

@Injectable()
export class SsiSovrhdAdapter {
  private sovrhdApiEndpoint: string;
  private PATH_REGISTER = 'register';
  private PATH_REQUEST = 'request';
  private axiosOptions = {
    timeout: 5000,
    maxRedirects: 5,
  };
  private credentialTypesMap: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    const sovrhdConfig = this.configService.get(ConfigurationTypes.SSI)?.issuers
      ?.sovrhd;
    this.sovrhdApiEndpoint = sovrhdConfig.endpoint;

    this.credentialTypesMap = new Map();
    const credentialTypes = sovrhdConfig.credential_types;
    for (const credentialType of credentialTypes) {
      const name = credentialType.name;
      const identifier = credentialType.identifier;
      this.credentialTypesMap.set(name, identifier);
    }
    this.logger.verbose?.(
      `Loaded in ${this.credentialTypesMap.size} credential types`,
      LogContext.SSI_SOVRHD
    );
  }

  getCredentialType(name: string): string {
    const identifier = this.credentialTypesMap.get(name);
    if (!identifier) {
      throw new SsiSovrhdCredentialTypeNotFoundException(
        `Unable to locate credential type identifier for: ${name}`,
        LogContext.SSI_SOVRHD
      );
    }
    return identifier;
  }

  async establishSession(
    callbackURL: string
  ): Promise<SsiSovrhdRegisterResponse> {
    this.logger.verbose?.(
      `Establishing session with callback hook: ${callbackURL}`,
      LogContext.SSI_SOVRHD
    );
    // Todo: retrieve the session ID properly
    const registerURL = `${this.sovrhdApiEndpoint}/${this.PATH_REGISTER}`;
    this.logger.verbose?.(
      `Registering session to: ${registerURL}`,
      LogContext.SSI_SOVRHD
    );
    const sessionInitiationPayload: SsiSovrhdRegister = {
      webhook: callbackURL,
    };

    this.logger.verbose?.(
      `Submitting establish session request: ${JSON.stringify(
        sessionInitiationPayload
      )}`,
      LogContext.SSI_SOVRHD
    );

    const sovrhdResponseData = await lastValueFrom<SsiSovrhdRegisterResponse>(
      this.httpService
        .post(registerURL, sessionInitiationPayload, this.axiosOptions)
        .pipe(map(resp => resp.data))
    );

    this.logger.verbose?.(
      `response establish session request: ${JSON.stringify(
        sovrhdResponseData
      )}`,
      LogContext.SSI_SOVRHD
    );
    if (!sovrhdResponseData.session) {
      throw new SsiSovrhdApiException(
        `Interaction with Sovrhd api failed: no session response: ${JSON.stringify(
          sovrhdResponseData
        )}`,
        LogContext.SSI_SOVRHD
      );
    }
    this.logger.verbose?.(
      `Sovrhd session initiated: ${sovrhdResponseData.session} with callback on ${sovrhdResponseData.webhook}`,
      LogContext.SSI_SOVRHD
    );
    return sovrhdResponseData;
  }

  async requestCredentials(
    sessionId: string,
    did: string,
    credentialName: string
  ): Promise<SsiSovrhdRequestResponse> {
    this.logger.verbose?.(
      `Using session (${sessionId}) to requesting credential of name: ${credentialName} for did ${did}`,
      LogContext.SSI_SOVRHD
    );

    const credentialTypeIdentifier = this.getCredentialType(credentialName);

    const requestURL = `${this.sovrhdApiEndpoint}/${this.PATH_REQUEST}`;

    const requestPayload: SsiSovrhdRequest = {
      session: sessionId,
      data: {
        did: did,
        credentialSchema: JSON.stringify([credentialTypeIdentifier]),
        type: 'request',
      },
    };

    this.logger.verbose?.(
      `Submitting request: ${JSON.stringify(requestPayload)}`,
      LogContext.SSI_SOVRHD
    );

    try {
      const sovrhdRequestResponseData =
        await lastValueFrom<SsiSovrhdRequestResponse>(
          this.httpService
            .post(requestURL, requestPayload, this.axiosOptions)
            .pipe(map(resp => resp.data))
        );
      this.logger.verbose?.(
        `Request returned: ${JSON.stringify(sovrhdRequestResponseData)}`,
        LogContext.SSI_SOVRHD
      );
      // if (!sovrhdRequestResponseData.session) {
      //   throw new SsiSovrhdApiError(
      //     `Interaction with Sovrhd api failed: no session response: ${JSON.stringify(
      //       sovrhdRequestResponseData
      //     )}`,
      //     LogContext.SSI_SOVRHD
      //   );
      // }
      // this.logger.verbose?.(
      //   `Sovrhd credentials returned: ${sovrhdRequestResponseData.session} with callback on ${sovrhdRequestResponseData.webhook}`,
      //   LogContext.SSI_SOVRHD
      // );
      return sovrhdRequestResponseData;
    } catch (error: any) {
      this.logger.error(
        `Unable to retrieve credential on session (${sessionId}): ${error}`,
        error?.stack,
        LogContext.SSI_SOVRHD
      );
      throw new SsiSovrhdCredentialRequestFailure(
        `Unable to retrieve credential on session (${sessionId}): ${error}`,
        LogContext.SSI_SOVRHD
      );
    }
  }

  validateSovrhdCredentialResponse(
    credentialCallback: SsiSovrhdRegisterCallbackCredential
  ): boolean {
    this.logger.verbose?.(
      `Validating credential response: ${credentialCallback.session}`,
      LogContext.SSI_SOVRHD
    );

    const credential = credentialCallback.content.verifiableCredential;
    if (credential.length === 0) {
      this.logger.error(
        `No validate credentials returned: ${JSON.stringify(
          credentialCallback
        )}`,
        undefined,
        LogContext.SSI_SOVRHD
      );
      return false;
    }

    return true;
  }
}
