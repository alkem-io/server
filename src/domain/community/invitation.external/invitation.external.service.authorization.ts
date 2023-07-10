import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InvitationExternal } from './invitation.external.entity';
import { IInvitationExternal } from './invitation.external.interface';

@Injectable()
export class InvitationExternalAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(InvitationExternal)
    private invitationExternalRepository: Repository<InvitationExternal>
  ) {}

  async applyAuthorizationPolicy(
    invitationExternal: IInvitationExternal,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInvitationExternal> {
    invitationExternal.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        invitationExternal.authorization,
        parentAuthorization
      );

    return await this.invitationExternalRepository.save(invitationExternal);
  }
}
