import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InnovationPackService } from './innovaton.pack.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPack } from './innovation.pack.entity';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';

@Injectable()
export class InnovationPackAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private innovationPackService: InnovationPackService,
    @InjectRepository(InnovationPack)
    private innovationPackRepository: Repository<InnovationPack>
  ) {}

  async applyAuthorizationPolicy(
    innovationPack: IInnovationPack,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInnovationPack> {
    // Ensure always applying from a clean state
    innovationPack.authorization = this.authorizationPolicyService.reset(
      innovationPack.authorization
    );
    innovationPack.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        innovationPack.authorization,
        parentAuthorization
      );

    // Cascade down
    const innovationPackPropagated =
      await this.propagateAuthorizationToChildEntities(innovationPack);

    return await this.innovationPackRepository.save(innovationPackPropagated);
  }

  private async propagateAuthorizationToChildEntities(
    innovationPack: IInnovationPack
  ): Promise<IInnovationPack> {
    innovationPack.templatesSet =
      await this.innovationPackService.getTemplatesSetOrFail(innovationPack.id);
    innovationPack.templatesSet =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        innovationPack.templatesSet,
        innovationPack.authorization
      );

    return innovationPack;
  }
}
