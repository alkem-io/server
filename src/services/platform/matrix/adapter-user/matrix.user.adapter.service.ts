import { ConfigurationTypes, LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMatrixUser } from './matrix.user.interface';

@Injectable()
export class MatrixUserAdapterService {
  private emailUsernameSpecialCharactersRegex = /[^a-zA-Z0-9_/-/=.]/g;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  convertCommunicationsIdToMatrixUser(
    communicationID: string,
    password = 'generated_password'
  ): IMatrixUser {
    return {
      name: this.convertCommunicationsIdToUsername(communicationID),
      username: communicationID,
      password: password,
    };
  }

  convertCommunicationsIdToUsername(communicationID: string) {
    return communicationID.replace('@', '').split(':')[0];
  }

  convertEmailToMatrixUsername(email: string) {
    // Note: the incoming email has the form "username@domain". This is then used to create a matrix ID.
    // Matrix: A user ID can only contain characters a-z, 0-9, or '=_-./'
    // Email username: Uppercase and lowercase letters in English (A-Z, a-z), Digits from 0 to 9, Special characters such as ! # $ % & ' * + - / = ? ^ _ ` { |
    // Email domain: Uppercase and lowercase letters in English (A-Z, a-z), digits from 0 to 9, A hyphen (-), A period (.)

    const emailParts = email.split('@');
    const emailUsername = emailParts[0];

    // All characters from email domain are valid in Matrix usernames
    const emailDomain = emailParts[1];
    // Email usernames need to have the not allowed characters removed
    const emailUsernameAdjusted = emailUsername.replace(
      this.emailUsernameSpecialCharactersRegex,
      ''
    );
    const username = `${emailUsernameAdjusted}=${emailDomain}`;
    return username.toLowerCase();
  }

  convertEmailToMatrixId(email: string) {
    return this.convertMatrixUsernameToMatrixId(
      this.convertEmailToMatrixUsername(email)
    );
  }

  convertMatrixUsernameToMatrixId(username: string) {
    const homeserverName = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.matrix?.homeserver_name;

    return `@${username}:${homeserverName}`;
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
