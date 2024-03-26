import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { SpaceService } from './space.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from './space.interface';
import { Space } from './space.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private spaceService: SpaceService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>
  ) {}

  async applyAuthorizationPolicy(
    spaceInput: ISpace,
    parentAuthorization?: IAuthorizationPolicy | undefined
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        community: {
          policy: true,
        },
        account: {
          license: true,
          authorization: true,
        },
      },
    });
    if (
      !space.community ||
      !space.community.policy ||
      !space.account ||
      !space.account.license ||
      !space.account.authorization
    )
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.CHALLENGES
      );

    const communityPolicyWithFlags =
      this.baseChallengeAuthorizationService.getCommunityPolicyWithSettings(
        space
      );

    const license = space.account.license;

    const inheritedAuthorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        space.authorization,
        parentAuthorization
      );

    // Extend rules depending on the Visibility
    switch (license.visibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        this.baseChallengeAuthorizationService.extendAuthorizationPolicyLocal(
          inheritedAuthorization,
          communityPolicyWithFlags
        );
        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        inheritedAuthorization.anonymousReadAccess = false;
        break;
    }

    space.authorization = inheritedAuthorization;
    await this.spaceService.save(space);

    // Cascade down
    // propagate authorization rules for child entities
    const spacePropagated =
      await this.baseChallengeAuthorizationService.propagateAuthorizationToChildEntities(
        space,
        license,
        this.spaceRepository
      );
    await this.propagateAuthorizationToSubspaces(spacePropagated);

    // Reload, to get all the saves from save above + with
    // key entities loaded that are needed for next steps
    space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        community: true,
      },
    });
    if (!space.community)
      throw new RelationshipNotFoundException(
        `Unable to load Space after first save: ${space.id} `,
        LogContext.CHALLENGES
      );

    // Finally update the child entities that depend on license
    // directly after propagation
    switch (license.visibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.community.authorization =
          this.baseChallengeAuthorizationService.extendCommunityAuthorizationPolicySpace(
            space.community.authorization,
            communityPolicyWithFlags
          );
        break;
      case SpaceVisibility.ARCHIVED:
        break;
    }

    return await this.spaceRepository.save(space);
  }

  public async propagateAuthorizationToSubspaces(
    spaceBase: ISpace
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceBase.id, {
      relations: {
        challenges: true,
      },
    });

    if (!space.challenges)
      throw new RelationshipNotFoundException(
        `Unable to load challenges for space ${space.id} `,
        LogContext.CHALLENGES
      );

    const spaceAdminCriteria = {
      type: AuthorizationCredential.SPACE_ADMIN,
      resourceID: space.id,
    };
    for (const challenge of space.challenges) {
      await this.challengeAuthorizationService.applyAuthorizationPolicy(
        challenge,
        space.authorization
      );

      challenge.authorization =
        this.baseChallengeAuthorizationService.extendSubSpaceAuthorization(
          challenge.authorization,
          spaceAdminCriteria
        );
    }

    return await this.spaceRepository.save(space);
  }
}
