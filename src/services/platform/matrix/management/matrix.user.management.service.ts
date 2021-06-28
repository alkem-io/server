import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'matrix-js-sdk/lib';
import { MatrixCryptographyService } from '@src/services/platform/matrix/cryptography/matrix.cryptography.service';
import { ConfigurationTypes } from '@common/enums';
import { MatrixIdentifierAdapter } from '../user/matrix.user.identifier.adapter';
import { CommunicationsSynapseEndpoint } from '@common/enums/communications.synapse.endpoint';
import { MatrixUserLoggedInResponse } from '../user/matrix.user.dto.logged.in.response';
import {
  IMatrixUser,
  IOperationalMatrixUser,
} from '../user/matrix.user.interface';
@Injectable()
export class MatrixUserManagementService {
  _matrixClient: any;
  idBaseUrl: string;
  baseUrl: string;

  constructor(
    private configService: ConfigService,
    private cryptographyServive: MatrixCryptographyService,
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
    isAdmin = false
  ): Promise<IOperationalMatrixUser> {
    const url = new URL(
      CommunicationsSynapseEndpoint.REGISTRATION,
      this.baseUrl
    );
    const user = this.convertIdToMatrixUser(email);

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
      throw new Error(`Unsuccessful registration for ${JSON.stringify(user)}`);
    }

    return {
      name: user.name,
      password: user.password,
      username: registrationResponse.data.user_id,
      accessToken: registrationResponse.data.access_token,
    };
  }

  async login(email: string): Promise<IOperationalMatrixUser> {
    const matrixUser = this.convertIdToMatrixUser(email);
    const operationalUser = await new Promise<MatrixUserLoggedInResponse>(
      (resolve, reject) =>
        this._matrixClient.loginWithPassword(
          matrixUser.username,
          matrixUser.password,
          (error: Error, response: MatrixUserLoggedInResponse) => {
            if (error) {
              reject(error);
            }
            resolve(response);
          }
        )
    );

    return {
      name: matrixUser.name,
      password: matrixUser.password,
      username: operationalUser.user_id,
      accessToken: operationalUser.access_token,
    };
  }

  async isRegistered(email: string): Promise<boolean> {
    const username = MatrixIdentifierAdapter.email2username(email);

    try {
      await this._matrixClient.isUsernameAvailable(username);
      return false;
    } catch (_) {
      // unfortunately instead of returning false the method throws exception
      return true;
    }
  }

  private convertIdToMatrixUser(email: string): IMatrixUser {
    const hostName = this.configService.get(ConfigurationTypes.Communications)
      ?.matrix?.server?.hostname;
    return {
      name: MatrixIdentifierAdapter.email2username(email),
      username: MatrixIdentifierAdapter.email2id(email, hostName),
      password: 'generated_password',
    };
  }
}
