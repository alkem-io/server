import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunicationAdminMembershipInput } from './dto';
import { LogContext } from '@common/enums';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { CommunicationAdminMembershipResult } from './dto/admin.communication.dto.membership.result';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { CommunicationAdminRoomMembershipResult } from './dto/admin.communication.dto.room.result';
import { IUser } from '@domain/community/user/user.interface';
import { CommunicationAdminEnsureAccessInput } from './dto/admin.communication.dto.ensure.access.input';
import { CommunicationAdminOrphanedUsageResult } from './dto/admin.communication.dto.orphaned.usage.result';
import { CommunicationAdminRoomResult } from './dto/admin.communication.dto.orphaned.room.result';
import { CommunicationAdminRemoveOrphanedRoomInput } from './dto/admin.communication.dto.remove.orphaned.room';
import { ValidationException } from '@common/exceptions';
import { RoleName } from '@common/enums/role.name';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';

@Injectable()
export class AdminCommunicationService {
  constructor(
    private communicationAdapter: CommunicationAdapter,
    private communicationService: CommunicationService,
    private communityService: CommunityService,
    private roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async communicationMembership(
    communicationData: CommunicationAdminMembershipInput
  ): Promise<CommunicationAdminMembershipResult> {
    this.logger.verbose?.(
      `communicationRoomMembership: ${communicationData.communityID}`,
      LogContext.COMMUNICATION
    );
    const community = await this.communityService.getCommunityOrFail(
      communicationData.communityID,
      {
        relations: {
          roleSet: true,
        },
      }
    );
    const communityMembers = await this.roleSetService.getUsersWithRole(
      community.roleSet,
      RoleName.MEMBER
    );
    const communication = await this.communityService.getCommunication(
      community.id,
      { communication: { updates: true } }
    );

    const result = new CommunicationAdminMembershipResult(
      communication.id,
      communication.displayName
    );
    const updates = this.communicationService.getUpdates(communication);
    const updatesResult = await this.createCommunicationAdminRoomResult(
      updates,
      communityMembers
    );
    result.rooms.push(updatesResult);

    return result;
  }

  private async createCommunicationAdminRoomResult(
    room: IRoom,
    communityMembers: IUser[]
  ): Promise<CommunicationAdminRoomMembershipResult> {
    const result = new CommunicationAdminRoomMembershipResult(
      room.id,
      room.displayName
    );
    result.roomID = room.externalRoomID;
    result.members = await this.communicationAdapter.getRoomMembers(
      room.externalRoomID
    );
    // check which ones are missing
    for (const communityMember of communityMembers) {
      const inCommunicationRoom = result.members.find(
        roomMember => roomMember === communityMember.communicationID
      );
      if (!inCommunicationRoom) {
        result.missingMembers.push(communityMember.communicationID);
      }
    }

    // check which ones are extra
    for (const roomMember of result.members) {
      const inCommunity = communityMembers.find(
        communityMember => communityMember.communicationID === roomMember
      );
      if (!inCommunity) {
        result.extraMembers.push(roomMember);
      }
    }

    return result;
  }

  async ensureCommunityAccessToCommunications(
    communicationData: CommunicationAdminEnsureAccessInput
  ): Promise<boolean> {
    this.logger.verbose?.(
      `communication admin ensure community access to communication: ${communicationData.communityID}`,
      LogContext.COMMUNICATION
    );
    const community = await this.communityService.getCommunityOrFail(
      communicationData.communityID,
      {
        relations: {
          roleSet: true,
        },
      }
    );
    const communication = await this.communityService.getCommunication(
      community.id
    );
    const communityMembers = await this.roleSetService.getUsersWithRole(
      community.roleSet,
      RoleName.MEMBER
    );
    for (const communityMember of communityMembers) {
      await this.communicationService.addContributorToCommunications(
        communication,
        communityMember.communicationID
      );
    }
    return true;
  }

  async updateMatrixRoomState(
    roomID: string,
    isPublic: boolean,
    isWorldVisible: boolean
  ) {
    return await this.communicationAdapter.updateMatrixRoomState(
      roomID,
      isWorldVisible,
      isPublic
    );
  }

  async removeOrphanedRoom(
    orphanedRoomData: CommunicationAdminRemoveOrphanedRoomInput
  ): Promise<boolean> {
    const orphanedRoomID = orphanedRoomData.roomID;
    const roomsUsed = await this.getRoomsUsed();
    const roomInUse = roomsUsed.find(roomID => roomID === orphanedRoomID);
    if (roomInUse) {
      throw new ValidationException(
        `Unable to remove orphaned room as it is used: ${orphanedRoomID}`,
        LogContext.COMMUNICATION
      );
    }
    return await this.communicationAdapter.removeRoom(orphanedRoomID);
  }

  async orphanedUsage(): Promise<CommunicationAdminOrphanedUsageResult> {
    this.logger.verbose?.(
      'communication admin checking for orphaned usage.',
      LogContext.COMMUNICATION
    );
    const result = new CommunicationAdminOrphanedUsageResult();
    const roomsUsed = await this.getRoomsUsed();

    // Get all the rooms used in Matrix + filter to only create results for those not used
    const matrixRooms = await this.communicationAdapter.adminGetAllRooms();
    for (const matrixRoom of matrixRooms) {
      const found = roomsUsed.find(roomID => roomID === matrixRoom.id);
      if (!found) {
        const roomNotUsed = await this.communicationAdapter.getCommunityRoom(
          matrixRoom.id
        );
        const roomResult = new CommunicationAdminRoomResult(
          roomNotUsed.id,
          roomNotUsed.displayName
        );
        roomResult.members = matrixRoom.members;
        result.rooms.push(roomResult);
      }
    }

    this.logger.verbose?.(
      `communication admin: found ${roomsUsed.length} rooms used; found ${matrixRooms.length} rooms in Matrix; found ${result.rooms.length} rooms not used`,
      LogContext.COMMUNICATION
    );

    return result;
  }

  private async getRoomsUsed(): Promise<string[]> {
    const communicationIDs =
      await this.communicationService.getCommunicationIDsUsed();
    let roomsUsed: string[] = [];
    for (const communicationID of communicationIDs) {
      const communication =
        await this.communicationService.getCommunicationOrFail(communicationID);
      const communicationRoomsUsed =
        await this.communicationService.getRoomsUsed(communication);
      roomsUsed = roomsUsed.concat(communicationRoomsUsed);
    }
    return roomsUsed;
  }
}
