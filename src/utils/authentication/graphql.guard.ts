import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { AuthenticationError } from 'apollo-server-core';
import { ConfigService } from '@nestjs/config';
import { IServiceConfig } from '../../interfaces/service.config.interface';

@Injectable()
export class GqlAuthGuard extends AuthGuard('azure-ad') {
  constructor(private configService: ConfigService) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    //console.log(req);

    return super.canActivate(new ExecutionContextHost([req]));
  }

  handleRequest(err: any, user: any) {
    // Always handle the request if authentication is disabled
    if (
      this.configService.get<IServiceConfig>('service')
        ?.authenticationEnabled === 'false'
    )
      return true;
    if (err || !user) {
      throw err || new AuthenticationError('GqlAuthGuard');
    }
    return user;
  }
}
