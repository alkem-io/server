import { CanActivate, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class WsGuard implements CanActivate {
  constructor() {}

  canActivate(
    context: any
  ): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
    const client = context.switchToWs().getClient();
    const bearerToken =
      context.args[0].handshake.headers.authorization.split(' ')[1];
  }
}
