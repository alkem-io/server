import {
  SPACE_INVITATION_ACCEPTORS_CHANGED,
  SpaceInvitationAcceptorsChanged,
} from '@domain/access/invitation/invitation.space.acceptors.event';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space } from './space.entity';
import { SpaceAuthorizationService } from './space.service.authorization';

@Injectable()
export class SpaceInvitationAcceptorsEventHandler {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    private readonly spaceAuthorizationService: SpaceAuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService
  ) {}

  @OnEvent(SPACE_INVITATION_ACCEPTORS_CHANGED)
  public async handle({
    roleSetID,
  }: SpaceInvitationAcceptorsChanged): Promise<void> {
    const space = await this.spaceRepository.findOneOrFail({
      where: { community: { roleSet: { id: roleSetID } } },
      loadEagerRelations: false,
    });
    const updatedAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
  }
}
