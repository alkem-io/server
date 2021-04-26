import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'matrix-js-sdk/lib';
import { IMatrixAuthProviderConfig } from '@src/services/configuration/config/matrix';
import { MatrixCryptographyService } from '@src/services/matrix/cryptography/cryptography.matrix.service';
import {
  IMatrixUser,
  IMatrixUserService,
  IOperationalMatrixUser,
} from './user.matrix.interface';

class SynapseEndpoints {
  static REGISTRATION = '/_synapse/admin/v1/register';
}

type LoggedInUserResponse = {
  user_id: string;
  access_token: string;
};

@Injectable()
export class MatrixUserService implements IMatrixUserService {
  private _config: IMatrixAuthProviderConfig;
  _matrixClient: any;
  constructor(
    private configService: ConfigService,
    private cryptographyServive: MatrixCryptographyService
  ) {
    this._config = this.configService.get<IMatrixAuthProviderConfig>(
      'matrix'
    ) as IMatrixAuthProviderConfig;

    if (!this._config || !this._config.baseUrl) {
      throw new Error('Matrix configuration is not provided');
    }

    // Create a single instance of the matrix client - non authenticated
    this._matrixClient = createClient({
      baseUrl: this._config.baseUrl,
      idBaseUrl: this._config.idBaseUrl,
    });
  }

  async register(user: IMatrixUser): Promise<IOperationalMatrixUser> {
    const url = new URL(SynapseEndpoints.REGISTRATION, this._config?.baseUrl);

    const nonceResponse = await fetch(url.href);
    const nonce = (await nonceResponse.json())['nonce'];
    const hmac = this.cryptographyServive.generateHmac(user, nonce);

    const registrationResponse = await fetch(url.href, {
      method: 'POST',
      body: JSON.stringify({
        nonce,
        username: user.name,
        password: user.password,
        mac: hmac,
      }),
    });

    if (
      registrationResponse.status >= 400 &&
      registrationResponse.status < 600
    ) {
      // TODO - handle details
      throw new Error('Bad response from server');
    }

    const response = await registrationResponse.json();

    return {
      name: user.name,
      password: user.password,
      username: response.user_id,
      accessToken: response.access_token,
    };
  }

  async login(user: IMatrixUser): Promise<IOperationalMatrixUser> {
    const operationalUser = await new Promise<LoggedInUserResponse>(
      (resolve, reject) =>
        this._matrixClient.loginWithPassword(
          user.username,
          user.password,
          (error: Error, response: LoggedInUserResponse) => {
            if (error) {
              reject(error);
            }
            resolve(response);
          }
        )
    );

    return {
      name: user.name,
      password: user.password,
      username: operationalUser.user_id,
      accessToken: operationalUser.access_token,
    };
  }
}
