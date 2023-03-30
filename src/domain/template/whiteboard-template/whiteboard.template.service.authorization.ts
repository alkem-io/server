import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteboardTemplate } from './whiteboard.template.entity';
import { IWhiteboardTemplate } from './whiteboard.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class WhiteboardTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(WhiteboardTemplate)
    private whiteboardTemplateRepository: Repository<WhiteboardTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    whiteboardTemplate: IWhiteboardTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IWhiteboardTemplate> {
    // Inherit from the parent
    whiteboardTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboardTemplate.authorization,
        parentAuthorization
      );
    whiteboardTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboardTemplate.profile,
        whiteboardTemplate.authorization
      );

    return await this.whiteboardTemplateRepository.save(whiteboardTemplate);
  }
}
