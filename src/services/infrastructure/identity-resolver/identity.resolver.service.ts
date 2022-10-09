import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@domain/community/user/user.entity';
import { Discussion } from '@domain/communication/discussion/discussion.entity';
import { Updates } from '@domain/communication/updates/updates.entity';

@Injectable()
export class IdentityResolverService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Discussion)
    private discussionRepository: Repository<Discussion>,
    @InjectRepository(Updates)
    private updatesRepository: Repository<Updates>
  ) {}

  async getUserIDByCommunicationsID(communicationID: string): Promise<string> {
    const userMatch = await this.userRepository
      .createQueryBuilder('user')
      .where('user.communicationID = :communicationID')
      .setParameters({
        communicationID: `${communicationID}`,
      })
      .getOne();
    if (userMatch) return userMatch.id;
    return '';
  }

  async getDiscussionIDByRoomID(
    communicationRoomID: string
  ): Promise<string | undefined> {
    const discussion = await this.discussionRepository
      .createQueryBuilder('discussion')
      .where('discussion.communicationRoomID = :roomID')
      .setParameters({
        roomID: `${communicationRoomID}`,
      })
      .getOne();
    if (discussion) return discussion.id;
    return undefined;
  }

  async getUpdatesIDByRoomID(
    communicationRoomID: string
  ): Promise<string | undefined> {
    const updates = await this.updatesRepository
      .createQueryBuilder('updates')
      .where('updates.communicationRoomID = :roomID')
      .setParameters({
        roomID: `${communicationRoomID}`,
      })
      .getOne();
    if (updates) return updates.id;
    return undefined;
  }
}
