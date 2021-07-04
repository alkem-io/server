import { HttpService, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'matrix-js-sdk/lib';
import { MatrixCryptographyService } from '@src/services/platform/matrix/cryptography/matrix.cryptography.service';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { MatrixUserAdapterService } from '../adapter-user/matrix.user.adapter.service';
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
    private matrixUserAdapterService: MatrixUserAdapterService,
    private httpService: HttpService
  ) {
    this.idBaseUrl = this.configService.get(
      ConfigurationTypes.Communications
    )?.matrix?.server?.url;
    this.baseUrl = this.configService.get(
      ConfigurationTypes.Communications
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
    email: string,
    password?: string,
    isAdmin = false
  ): Promise<IOperationalMatrixUser> {
    const url = new URL(
      CommunicationsSynapseEndpoint.REGISTRATION,
      this.baseUrl
    );
    const user = this.matrixUserAdapterService.convertEmailToMatrixUser(
      email,
      password
    );

    const nonceResponse = await this.httpService
      .get<{ nonce: string }>(url.href)
      .toPromise();
    const nonce = nonceResponse.data['nonce'];
    const hmac = this.cryptographyServive.generateHmac(user, nonce, isAdmin);

    const registrationResponse = await this.httpService
      .post<{ user_id: string; access_token: string }>(url.href, {
        nonce,
        username: user.name,
        password: user.password,
        bind_emails: [email],
        admin: isAdmin,
        mac: hmac,
      })
      .toPromise();

    if (
      registrationResponse.status > 400 &&
      registrationResponse.status < 600
    ) {
      throw new MatrixUserRegistrationException(
        `Unsuccessful registration for ${JSON.stringify(user)}`,
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
    this.matrixUserAdapterService.logMatrixUser(operationalUser, msg);
    return operationalUser;
  }

  async login(
    email: string,
    password?: string
  ): Promise<IOperationalMatrixUser> {
    const matrixUser = this.matrixUserAdapterService.convertEmailToMatrixUser(
      email,
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
      this.matrixUserAdapterService.logMatrixUser(matrixUser, 'login failed');
      throw new MatrixUserLoginException(
        `Error: ${error}`,
        LogContext.COMMUNICATION
      );
    }
  }

  async isRegistered(email: string): Promise<boolean> {
    const username = this.matrixUserAdapterService.email2username(email);

    try {
      await this._matrixClient.isUsernameAvailable(username);
      return false;
    } catch (_) {
      // unfortunately instead of returning false the method throws exception
      return true;
    }
  }
}
