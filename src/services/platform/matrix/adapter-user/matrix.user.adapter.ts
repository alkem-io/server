import { ConfigurationTypes, LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMatrixUser } from './matrix.user.interface';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixUserMembershipException } from '@common/exceptions/matrix.membership.exception';

@Injectable()
export class MatrixUserAdapter {
  private emailUsernameSpecialCharactersRegex = /[^a-zA-Z0-9_/-/=.]/g;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {}

  async getJoinedRooms(matrixClient: MatrixClient): Promise<string[]> {
    const response = (await matrixClient.getJoinedRooms()) as any as {
      joined_rooms: string[];
    };
    return response.joined_rooms;
  }

  async getJoinedGroups(matrixClient: MatrixClient): Promise<string[]> {
    const groupsResponse = await matrixClient.getJoinedGroups();
    const response = groupsResponse as any as {
      groups: string[];
    };
    return response.groups;
  }

  async verifyRoomMembershipOrFail(
    matrixClient: MatrixClient,
    roomID: string
  ): Promise<boolean> {
    const result = await this.isUserMemberOfRoom(matrixClient, roomID);
    if (!result) {
      throw new MatrixUserMembershipException(
        `[Membership] user (${matrixClient.getUserId()}) is NOT a member of: ${roomID}`,
        LogContext.COMMUNICATION
      );
    }
    return result;
  }

  async isUserMemberOfRoom(
    matrixClient: MatrixClient,
    roomID: string
  ): Promise<boolean> {
    const rooms = await this.getJoinedRooms(matrixClient);
    const roomFound = rooms.find(r => r === roomID);
    if (roomFound) {
      this.logger.verbose?.(
        `[Membership] user (${matrixClient.getUserId()}) is a member of: ${roomID}`,
        LogContext.COMMUNICATION
      );
      return true;
    }
    return false;
  }

  async logJoinedRooms(matrixClient: MatrixClient) {
    const rooms = await this.getJoinedRooms(matrixClient);
    this.logger.verbose?.(
      `[Membership] user (${matrixClient.getUserId()}) rooms: ${rooms}`,
      LogContext.COMMUNICATION
    );
  }

  convertMatrixIDToMatrixUser(
    matrixUserID: string,
    password = 'generated_password'
  ): IMatrixUser {
    return {
      name: this.convertMatrixIDToUsername(matrixUserID),
      username: matrixUserID,
      password: password,
    };
  }

  convertMatrixIDToUsername(matrixUserID: string) {
    return matrixUserID.replace('@', '').split(':')[0];
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

  convertEmailToMatrixID(email: string) {
    return this.convertMatrixUsernameToMatrixID(
      this.convertEmailToMatrixUsername(email)
    );
  }

  convertMatrixUsernameToMatrixID(username: string) {
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
