import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { CardProfileService } from './card.profile.service';
import { CardProfile } from './card.profile.entity';
import { ICardProfile } from './card.profile.interface';

@Injectable()
export class CardProfileAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private cardProfileService: CardProfileService,
    @InjectRepository(CardProfile)
    private cardProfileRepository: Repository<CardProfile>
  ) {}

  async applyAuthorizationPolicy(
    cardProfileInput: ICardProfile,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICardProfile> {
    const cardProfile = await this.cardProfileService.getCardProfileOrFail(
      cardProfileInput.id,
      {
        relations: ['references', 'tagset', 'authorization'],
      }
    );

    // Inherit from the parent
    cardProfile.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        cardProfile.authorization,
        parentAuthorization
      );

    if (cardProfile.references) {
      for (const reference of cardProfile.references) {
        reference.authorization =
          this.authorizationPolicyService.inheritParentAuthorization(
            reference.authorization,
            cardProfile.authorization
          );
      }
    }

    if (cardProfile.tagset) {
      cardProfile.tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          cardProfile.tagset.authorization,
          cardProfile.authorization
        );
    }

    return await this.cardProfileRepository.save(cardProfile);
  }
}
