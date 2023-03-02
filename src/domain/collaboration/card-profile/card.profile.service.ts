import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Reference } from '@domain/common/reference/reference.entity';
import { IReference } from '@domain/common/reference/reference.interface';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateCardProfileInput, UpdateCardProfileInput } from './dto';
import { RestrictedTagsetNames } from '@domain/common/tagset';
import { CardProfile } from './card.profile.entity';
import { ICardProfile } from './card.profile.interface';
import { CreateReferenceOnCardProfileInput } from './dto/card.profile.dto.create.reference';
import { ILocation, LocationService } from '@domain/common/location';

@Injectable()
export class CardProfileService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    private locationService: LocationService,
    private referenceService: ReferenceService,
    @InjectRepository(CardProfile)
    private cardProfileRepository: Repository<CardProfile>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCardProfile(
    cardProfileData?: CreateCardProfileInput
  ): Promise<ICardProfile> {
    const cardProfile: ICardProfile = CardProfile.create({
      description: cardProfileData?.description,
      references: cardProfileData?.referencesData,
    });
    cardProfile.authorization = new AuthorizationPolicy();

    cardProfile.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: cardProfileData?.tags || [],
    });

    if (!cardProfile.references) {
      cardProfile.references = [];
    }

    cardProfile.location = await this.locationService.createLocation(
      cardProfileData?.location
    );

    await this.cardProfileRepository.save(cardProfile);
    this.logger.verbose?.(
      `Created new cardProfile with id: ${cardProfile.id}`,
      LogContext.COMMUNITY
    );
    return cardProfile;
  }

  async updateCardProfile(
    cardProfileOrig: ICardProfile,
    cardProfileData: UpdateCardProfileInput
  ): Promise<ICardProfile> {
    const cardProfile = await this.getCardProfileOrFail(cardProfileOrig.id, {
      relations: ['references', 'tagset', 'authorization', 'location'],
    });

    if (cardProfileData.description) {
      cardProfile.description = cardProfileData.description;
    }

    if (cardProfileData.references) {
      cardProfile.references = this.referenceService.updateReferences(
        cardProfile.references,
        cardProfileData.references
      );
    }

    if (cardProfileData.location) {
      this.locationService.updateLocationValues(
        cardProfile.location,
        cardProfileData.location
      );
    }

    if (cardProfileData.tags) {
      if (!cardProfile.tagset) {
        throw new EntityNotInitializedException(
          `Aspect with id(${cardProfile.id}) not initialised with a tagset!`,
          LogContext.COMMUNITY
        );
      }
      cardProfile.tagset.tags = [...cardProfileData.tags];
    }

    return await this.cardProfileRepository.save(cardProfile);
  }

  async deleteCardProfile(cardProfileID: string): Promise<ICardProfile> {
    // Note need to load it in with all contained entities so can remove fully
    const cardProfile = await this.getCardProfileOrFail(cardProfileID, {
      relations: ['references', 'tagset', 'authorization', 'location'],
    });

    if (cardProfile.tagset) {
      await this.tagsetService.removeTagset({ ID: cardProfile.tagset.id });
    }

    if (cardProfile.references) {
      for (const reference of cardProfile.references) {
        await this.referenceService.deleteReference({
          ID: reference.id,
        });
      }
    }

    if (cardProfile.location) {
      await this.locationService.removeLocation(cardProfile.location);
    }

    if (cardProfile.authorization)
      await this.authorizationPolicyService.delete(cardProfile.authorization);

    return await this.cardProfileRepository.remove(cardProfile as CardProfile);
  }

  async createReference(
    referenceInput: CreateReferenceOnCardProfileInput
  ): Promise<IReference> {
    const cardProfile = await this.getCardProfileOrFail(
      referenceInput.cardProfileID,
      {
        relations: ['references'],
      }
    );

    if (!cardProfile.references)
      throw new EntityNotInitializedException(
        'References not defined',
        LogContext.COMMUNITY
      );
    // check there is not already a reference with the same name
    for (const reference of cardProfile.references) {
      if (reference.name === referenceInput.name) {
        throw new ValidationException(
          `Reference with the provided name already exists: ${referenceInput.name}`,
          LogContext.CONTEXT
        );
      }
    }
    // If get here then no ref with the same name
    const newReference = await this.referenceService.createReference(
      referenceInput
    );

    await cardProfile.references.push(newReference as Reference);
    await this.cardProfileRepository.save(cardProfile);

    return newReference;
  }

  async getCardProfileOrFail(
    cardProfileID: string,
    options?: FindOneOptions<CardProfile>
  ): Promise<ICardProfile> {
    const cardProfile = await CardProfile.findOne({
      where: {
        id: cardProfileID,
      },
      ...options,
    });
    if (!cardProfile)
      throw new EntityNotFoundException(
        `CardProfile with id(${cardProfileID}) not found!`,
        LogContext.COMMUNITY
      );
    return cardProfile;
  }

  async getReferences(cardProfileInput: ICardProfile): Promise<IReference[]> {
    const cardProfile = await this.getCardProfileOrFail(cardProfileInput.id, {
      relations: ['references'],
    });
    if (!cardProfile.references) {
      throw new EntityNotInitializedException(
        `CardProfile not initialized: ${cardProfile.id}`,
        LogContext.COMMUNITY
      );
    }
    return cardProfile.references;
  }

  async getLocation(cardProfileInput: ICardProfile): Promise<ILocation> {
    const cardProfile = await this.getCardProfileOrFail(cardProfileInput.id, {
      relations: ['location'],
    });
    if (!cardProfile.location) {
      throw new EntityNotInitializedException(
        `CardProfile not initialized: ${cardProfile.id}`,
        LogContext.COLLABORATION
      );
    }
    return cardProfile.location;
  }

  async getTagset(cardProfileID: string): Promise<ITagset> {
    const cardProfile = await this.getCardProfileOrFail(cardProfileID, {
      relations: ['tagset'],
    });
    if (!cardProfile.tagset) {
      throw new EntityNotInitializedException(
        `CardProfile not initialized: ${cardProfile.id}`,
        LogContext.COMMUNITY
      );
    }
    return cardProfile.tagset;
  }
}
