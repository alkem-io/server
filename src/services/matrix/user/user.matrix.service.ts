import { HttpService, Injectable } from '@nestjs/common';
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

export class MatrixTransforms {
  static mailRegex = /[@\.]/g;
  static email2username(email: string) {
    return email.replace(MatrixTransforms.mailRegex, '_');
  }
  // TODO - this needs to be a service that works with env.HOST_NAME
  static username2id(username: string) {
    return `@${username}:cherrytwist.matrix.host`;
  }
  static email2id(email: string) {
    return MatrixTransforms.username2id(MatrixTransforms.email2username(email));
  }
}

@Injectable()
export class MatrixUserService implements IMatrixUserService {
  private _config: IMatrixAuthProviderConfig;
  _matrixClient: any;
  constructor(
    private configService: ConfigService,
    private cryptographyServive: MatrixCryptographyService,
    private httpService: HttpService
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

  async register(email: string): Promise<IOperationalMatrixUser> {
    const url = new URL(SynapseEndpoints.REGISTRATION, this._config?.baseUrl);
    const user = this.resolveUser(email);

    const nonceResponse = await this.httpService
      .get<{ nonce: string }>(url.href)
      .toPromise();
    const nonce = nonceResponse.data['nonce'];
    const hmac = this.cryptographyServive.generateHmac(user, nonce);

    const registrationResponse = await this.httpService
      .post<{ user_id: string; access_token: string }>(url.href, {
        nonce,
        username: user.name,
        password: user.password,
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
    const user = this.resolveUser(email);
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

  async isRegistered(email: string): Promise<boolean> {
    const username = MatrixTransforms.email2username(email);

    try {
      await this._matrixClient.isUsernameAvailable(username);
      return false;
    } catch (_) {
      // unfortunately instead of returning false the method throws exception
      return true;
    }
  }

  private resolveUser(email: string): IMatrixUser {
    return {
      name: MatrixTransforms.email2username(email),
      username: MatrixTransforms.email2id(email),
      password: 'generated_password',
    };
  }
}
