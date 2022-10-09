import { AxiosError } from 'axios';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'matrix-js-sdk/lib';
import { MatrixCryptographyService } from '@services/external/matrix/cryptography/matrix.cryptography.service';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { MatrixUserAdapter } from '../adapter-user/matrix.user.adapter';
import { CommunicationsSynapseEndpoint } from '@common/enums/communications.synapse.endpoint';
import { IOperationalMatrixUser } from '../adapter-user/matrix.user.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixUserLoginException } from '@common/exceptions/matrix.login.exception';
import { MatrixUserRegistrationException } from '@common/exceptions/matrix.registration.exception';
@Injectable()
export class MatrixUserManagementService {
  _matrixClient: MatrixClient;
  idBaseUrl: string;
  baseUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService,
    private cryptographyServive: MatrixCryptographyService,
    private matrixUserAdapter: MatrixUserAdapter,
    private httpService: HttpService
  ) {
    this.idBaseUrl = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.server?.url;
    this.baseUrl = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.server?.url;

    if (!this.idBaseUrl || !this.baseUrl) {
      throw new Error('Matrix configuration is not provided');
    }

    // Create a single instance of the matrix client - non authenticated
    // Todo: should be handed (injected) to this client instance externally!
    this._matrixClient = createClient({
      baseUrl: this.baseUrl,
      idBaseUrl: this.idBaseUrl,
    });
  }

  async register(
    matrixUserID: string,
    password?: string,
    isAdmin = false
  ): Promise<IOperationalMatrixUser> {
    const url = new URL(
      CommunicationsSynapseEndpoint.REGISTRATION,
      this.baseUrl
    );
    const user = this.matrixUserAdapter.convertMatrixIDToMatrixUser(
      matrixUserID,
      password
    );

    const nonceResponse = await this.httpService
      .get<{ nonce: string }>(url.href)
      .toPromise();

    if (!nonceResponse)
      throw new MatrixUserRegistrationException(
        'Invalid nonce response!',
        LogContext.COMMUNICATION
      );

    const nonce = nonceResponse.data['nonce'];
    const hmac = this.cryptographyServive.generateHmac(user, nonce, isAdmin);

    const registerBody = {
      nonce,
      username: user.name,
      password: user.password,
      bind_emails: [],
      admin: isAdmin,
      mac: hmac,
    };

    const registrationResponse = await this.httpService
      .post<{ user_id: string; access_token: string }>(url.href, registerBody)
      .toPromise()
      .catch((err: unknown) => {
        const error = err as AxiosError;
        this.logger.error(
          `Matrix user registration failed: ${error.message}${
            error.response && JSON.stringify(error.response?.data)
          }`
        );
      });

    if (!registrationResponse)
      throw new MatrixUserRegistrationException(
        'Invalid registration response!',
        LogContext.COMMUNICATION
      );

    if (
      registrationResponse?.status > 400 &&
      registrationResponse.status < 600
    ) {
      throw new MatrixUserRegistrationException(
        `Unsuccessful registration for ${JSON.stringify(user)}`,
        LogContext.COMMUNICATION
      );
    }

    // Check to ensure that the response home server matches the request
    if (registrationResponse.data.user_id !== user.username) {
      throw new MatrixUserRegistrationException(
        `Registration response user_id '${registrationResponse.data.user_id}' is not equal to the supplied username: ${user.username} - please check configuration`,
        LogContext.COMMUNICATION
      );
    }

    const operationalUser = {
      name: user.name,
      password: user.password,
      username: registrationResponse.data.user_id,
      accessToken: registrationResponse.data.access_token,
    };
    let msg = 'User registration';
    if (isAdmin) msg = 'Admin registration';
    this.matrixUserAdapter.logMatrixUser(operationalUser, msg);
    return operationalUser;
  }

  async login(
    matrixUserID: string,
    password?: string
  ): Promise<IOperationalMatrixUser> {
    const matrixUser = this.matrixUserAdapter.convertMatrixIDToMatrixUser(
      matrixUserID,
      password
    );

    try {
      const operationalUser = await this._matrixClient.loginWithPassword(
        matrixUser.username,
        matrixUser.password
      );
      return {
        name: matrixUser.name,
        password: matrixUser.password,
        username: operationalUser.user_id,
        accessToken: operationalUser.access_token,
      };
    } catch (error) {
      this.matrixUserAdapter.logMatrixUser(matrixUser, 'login failed');
      throw new MatrixUserLoginException(
        `Error: ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }

  //@Profiling.asyncApi
  async isRegistered(matrixUserID: string): Promise<boolean> {
    const username =
      this.matrixUserAdapter.convertMatrixIDToUsername(matrixUserID);
    /*try {
      const username =
        this.matrixUserAdapter.convertMatrixIDToUsername(matrixUserID);
      const isUsernameAvailable = await this._matrixClient.isUsernameAvailable(username);
      return false;
    } catch (error: any) {
      const errcode = error.errcode;
      if (errcode === 'M_USER_IN_USE') {
        return true;
      }
      this.logger.error(
        `Unable to check if username is available: ${error}`,
        LogContext.COMMUNICATION
      );
      throw error;
    }*/
    try {
      const isUsernameAvailable = await this._matrixClient.isUsernameAvailable(
        username
      );
      return !isUsernameAvailable;
    } catch (error: unknown) {
      this.logger.error(
        `Unable to check if username is available: ${error}`,
        LogContext.COMMUNICATION
      );
      return false;
    }
  }
}
