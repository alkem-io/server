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
      name: this.convertEmailToMatrixUsername(email),
      username: this.convertEmailToMatrixId(email),
      password: password,
    };
  }

  convertEmailToMatrixUsername(email: string) {
    return email.replace(this.mailRegex, '=');
  }

  convertMatrixUsernameToMatrixId(username: string) {
    const homeserverName = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.homeserver_name;

    return `@${username}:${homeserverName}`;
  }

  convertEmailToMatrixId(email: string) {
    return this.convertMatrixUsernameToMatrixId(
      this.convertEmailToMatrixUsername(email)
    );
  }

  convertMatrixUsernameToEmail(username: string) {
    return username.replace(/[=]/g, '@');
  }

  convertMatrixIdToEmail(id: string) {
    return this.convertMatrixUsernameToEmail(id.replace('@', '').split(':')[0]);
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
