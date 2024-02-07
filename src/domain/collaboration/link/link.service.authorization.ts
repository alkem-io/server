import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { LinkService } from './link.service';
import { ILink } from './link.interface';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class LinkAuthorizationService {
  constructor(
    private linkService: LinkService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  public async applyAuthorizationPolicy(
    linkInput: ILink,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ILink> {
    const link = await this.linkService.getLinkOrFail(linkInput.id, {
      relations: {
        profile: true,
      },
    });
    if (!link.profile)
      throw new RelationshipNotFoundException(
        `Unable to load entities on link:  ${link.id} `,
        LogContext.COLLABORATION
      );
    link.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        link.authorization,
        parentAuthorization
      );

    link.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        link.profile,
        link.authorization
      );

    return this.linkService.save(link);
  }
}
