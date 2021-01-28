import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import {
  AuthenticationException,
  TokenException,
} from '@utils/error-handling/exceptions';
import NodeCache from 'node-cache';
import jwt_decode from 'jwt-decode';
import { IUser } from '@domain/user/user.interface';

@Injectable()
export class AuthService {
  myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

  constructor(private readonly userService: UserService) {}

  async getUserFromToken(encodedToken: any): Promise<[IUser, string]> {
    const token = (await jwt_decode(encodedToken)) as any;

    if (!token.email) throw new AuthenticationException('Token email missing!');

    await this.cacheBearerToken(encodedToken);

    const knownUser = await this.userService.getUserWithGroups(token.email);
    if (!knownUser)
      throw new AuthenticationException(
        `No user with email ${token.email} found!`
      );

    return [knownUser, token];
  }

  //in-memory cache for the Bearer token so it can be shared between requests
  private async cacheBearerToken(accessToken: string) {
    try {
      await this.myCache.set('accessToken', accessToken, 60);
    } catch (error) {
      throw new TokenException(
        `Failed adding the user to the request object: ${error}`
      );
    }
  }

  async getCachedBearerToken(): Promise<string> {
    const accessToken = await this.myCache.get('accessToken');
    return accessToken as string;
  }
}
