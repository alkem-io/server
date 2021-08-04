import { ConfigurationTypes, LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMatrixUser } from './matrix.user.interface';

@Injectable()
export class MatrixUserAdapterService {
  private mailRegex = /[@]/g;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  convertEmailToMatrixUser(
    email: string,
    password = 'generated_password'
  ): IMatrixUser {
    return {
      name: this.email2username(email),
      username: this.email2id(email),
      password: password,
    };
  }

  email2username(email: string) {
    return email.replace(this.mailRegex, '=');
  }

  username2id(username: string) {
    const homeserverName = this.configService.get(
      ConfigurationTypes.Communications
    )?.matrix?.homeserver_name;

    return `@${username}:${homeserverName}`;
  }

  email2id(email: string) {
    return this.username2id(this.email2username(email));
  }

  username2email(username: string) {
    return username.replace(/[=]/g, '@');
  }

  id2email(id: string) {
    return this.username2email(id.replace('@', '').split(':')[0]);
  }

  logMatrixUser(matrixUser: Partial<IMatrixUser>, msg?: string) {
    let prefix = '';
    if (msg) prefix = `[${msg}] - `;
    this.logger.verbose?.(
      `${prefix}name '${matrixUser.name}', username '${matrixUser.username}', password '${matrixUser.password}'`,
      LogContext.COMMUNICATION
    );
  }
}
