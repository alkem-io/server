import { Invitation, IInvitation } from '@domain/community/invitation';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindManyOptions, Repository } from 'typeorm';

@Injectable()
export class InvitationUtilService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async findExistingInvitations(
    userID: string,
    communityID: string
  ): Promise<IInvitation[]> {
    const existingInvitations = await this.invitationRepository.find({
      where: { invitedUser: userID, community: { id: communityID } },
      relations: ['community'],
    });

    if (existingInvitations.length > 0) return existingInvitations;
    return [];
  }

  async findInvitationsForUser(userID: string): Promise<IInvitation[]> {
    const findOpts: FindManyOptions<Invitation> = {
      relations: { community: true, lifecycle: true },
      where: { invitedUser: userID },
      select: {
        lifecycle: {
          machineState: true,
          machineDef: true,
        },
      },
    };
    const invitations = await this.invitationRepository.find(findOpts);

    return invitations;
  }
}
