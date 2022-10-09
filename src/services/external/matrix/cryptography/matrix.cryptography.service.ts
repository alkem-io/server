import { ConfigurationTypes } from '@common/enums';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto-js';
import { IMatrixUser } from '../adapter-user/matrix.user.interface';
@Injectable()
export class MatrixCryptographyService {
  constructor(private configService: ConfigService) {}

  generateHmac(user: IMatrixUser, nonce: string, isAdmin?: boolean): string {
    const sharedSecret = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.server?.shared_secret;

    if (!sharedSecret) {
      throw new Error('Matrix configuration is not provided');
    }

    const mac = crypto.enc.Utf8.parse(sharedSecret);
    const hmac = crypto.algo.HMAC.create(crypto.algo.SHA1, mac);

    const toUft8 = (value: string) => crypto.enc.Utf8.parse(value);

    hmac.update(toUft8(nonce));
    hmac.update(toUft8('\x00'));
    hmac.update(toUft8(user.name));
    hmac.update(toUft8('\x00'));
    hmac.update(toUft8(user.password));
    hmac.update(toUft8('\x00'));
    hmac.update(toUft8(isAdmin ? 'admin' : 'notadmin'));

    return crypto.enc.Hex.stringify(hmac.finalize());
  }
}
