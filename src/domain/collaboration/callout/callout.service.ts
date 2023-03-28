import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import {
  CreateCalloutInput,
  CreateAspectOnCalloutInput,
  CreateCanvasOnCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto/index';
import { Aspect } from '@domain/collaboration/aspect/aspect.entity';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { limitAndShuffle } from '@common/utils';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { CommentsService } from '@domain/communication/comments/comments.service';
import { IComments } from '@domain/communication/comments/comments.interface';
import { CalloutType } from '@common/enums/callout.type';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { AspectTemplateService } from '@domain/template/aspect-template/aspect.template.service';
import { IAspectTemplate } from '@domain/template/aspect-template/aspect.template.interface';
import { UserService } from '@domain/community/user/user.service';
import { ICanvasTemplate } from '@domain/template/canvas-template/canvas.template.interface';
import { CanvasTemplateService } from '@domain/template/canvas-template/canvas.template.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';

@Injectable()
export class CalloutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aspectService: AspectService,
    private aspectTemplateService: AspectTemplateService,
    private canvasTemplateService: CanvasTemplateService,
    private canvasService: CanvasService,
    private namingService: NamingService,
    private commentsService: CommentsService,
    private userService: UserService,
    private profileService: ProfileService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput,
    communicationGroupID: string,
    userID?: string
  ): Promise<ICallout> {
    if (calloutData.type == CalloutType.CARD && !calloutData.cardTemplate) {
      throw new Error('Please provide a card template');
    }

    if (calloutData.type == CalloutType.CANVAS && !calloutData.canvasTemplate) {
      throw new Error('Please provide a canvas template');
    }

    if (!calloutData.sortOrder) {
      calloutData.sortOrder = 10;
    }

    // Save the card template data for creation via service
    // Note: do NOT save the callout card template that is created through ORM creation flow,
    // as otherwise get a cardTemplate created without any child entities (auth etc)
    const cardTemplateData = calloutData.cardTemplate;
    const canvasTemplateData = calloutData.canvasTemplate;
    const calloutNameID = this.namingService.createNameID(
      `${calloutData.profile.displayName}`
    );
    const calloutCreationData = {
      ...calloutData,
      nameID: calloutData.nameID ?? calloutNameID,
    };
    const callout: ICallout = Callout.create(calloutCreationData);
    callout.profile = await this.profileService.createProfile(
      calloutData.profile
    );
    if (calloutData.type == CalloutType.CARD && cardTemplateData) {
      callout.cardTemplate =
        await this.aspectTemplateService.createAspectTemplate(cardTemplateData);
    }
    if (calloutData.type == CalloutType.CANVAS && canvasTemplateData) {
      callout.canvasTemplate =
        await this.canvasTemplateService.createCanvasTemplate(
          canvasTemplateData
        );
    }

    callout.authorization = new AuthorizationPolicy();
    callout.createdBy = userID ?? undefined;

    const savedCallout: ICallout = await this.calloutRepository.save(callout);
    savedCallout.visibility = CalloutVisibility.DRAFT;

    if (calloutData.type === CalloutType.COMMENTS) {
      savedCallout.comments = await this.commentsService.createComments(
        communicationGroupID,
        `callout-comments-${savedCallout.nameID}`
      );
      return await this.calloutRepository.save(savedCallout);
    }

    return savedCallout;
  }

  public async getCalloutOrFail(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout | never> {
    let callout: ICallout | null = null;
    if (calloutID.length === UUID_LENGTH) {
      callout = await this.calloutRepository.findOne({
        where: { id: calloutID },
        ...options,
      });
    }
    if (!callout) {
      // look up based on nameID
      callout = await this.calloutRepository.findOne({
        where: { nameID: calloutID },
        ...options,
      });
    }
    if (!callout)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${calloutID}`,
        LogContext.COLLABORATION
      );
    return callout;
  }

  public async updateCalloutVisibility(
    calloutUpdateData: UpdateCalloutVisibilityInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutUpdateData.calloutID);

    if (calloutUpdateData.visibility)
      callout.visibility = calloutUpdateData.visibility;

    return await this.calloutRepository.save(callout);
  }

  public async updateCalloutPublishInfo(
    callout: ICallout,
    publisherID?: string,
    publishedTimestamp?: number
  ): Promise<ICallout> {
    if (publisherID) {
      const publisher = await this.userService.getUserOrFail(publisherID);
      callout.publishedBy = publisher.id;
    }

    if (publishedTimestamp) {
      const date = new Date(publishedTimestamp);
      callout.publishedDate = date;
    }

    return await this.calloutRepository.save(callout);
  }

  public async updateCallout(
    calloutUpdateData: UpdateCalloutInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutUpdateData.ID, {
      relations: [
        'cardTemplate',
        'canvasTemplate',
        'cardTemplate.profile',
        'canvasTemplate.profile',
        'profile',
      ],
    });

    if (calloutUpdateData.profileData) {
      callout.profile = await this.profileService.updateProfile(
        callout.profile,
        calloutUpdateData.profileData
      );
    }

    if (calloutUpdateData.state) callout.state = calloutUpdateData.state;

    if (calloutUpdateData.sortOrder)
      callout.sortOrder = calloutUpdateData.sortOrder;

    if (
      callout.type == CalloutType.CARD &&
      callout.cardTemplate &&
      calloutUpdateData.cardTemplate
    ) {
      callout.cardTemplate =
        await this.aspectTemplateService.updateAspectTemplate(
          callout.cardTemplate,
          { ID: callout.cardTemplate.id, ...calloutUpdateData.cardTemplate }
        );
    }

    if (
      callout.type == CalloutType.CANVAS &&
      callout.canvasTemplate &&
      calloutUpdateData.canvasTemplate
    ) {
      callout.canvasTemplate =
        await this.canvasTemplateService.updateCanvasTemplate(
          callout.canvasTemplate,
          { ID: callout.canvasTemplate.id, ...calloutUpdateData.canvasTemplate }
        );
    }

    return await this.calloutRepository.save(callout);
  }

  async save(callout: ICallout): Promise<ICallout> {
    return await this.calloutRepository.save(callout);
  }

  public async deleteCallout(calloutID: string): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: [
        'aspects',
        'canvases',
        'comments',
        'cardTemplate',
        'canvasTemplate',
        'profile',
      ],
    });

    if (callout.profile) {
      await this.profileService.deleteProfile(callout.profile.id);
    }

    if (callout.canvases) {
      for (const canvas of callout.canvases) {
        await this.canvasService.deleteCanvas(canvas.id);
      }
    }

    if (callout.aspects) {
      for (const aspect of callout.aspects) {
        await this.aspectService.deleteAspect({ ID: aspect.id });
      }
    }

    if (callout.comments) {
      await this.commentsService.deleteComments(callout.comments);
    }

    if (callout.cardTemplate) {
      await this.aspectTemplateService.deleteAspectTemplate(
        callout.cardTemplate
      );
    }

    if (callout.canvasTemplate) {
      await this.canvasTemplateService.deleteCanvasTemplate(
        callout.canvasTemplate
      );
    }

    if (callout.authorization)
      await this.authorizationPolicyService.delete(callout.authorization);

    const result = await this.calloutRepository.remove(callout as Callout);
    result.id = calloutID;

    return result;
  }

  public async getProfile(
    calloutInput: ICallout,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const callout = await this.getCalloutOrFail(calloutInput.id, {
      relations: ['profile', ...relations],
    });
    if (!callout.profile)
      throw new EntityNotFoundException(
        `Callout profile not initialised: ${calloutInput.id}`,
        LogContext.COLLABORATION
      );

    return callout.profile;
  }

  public async getActivityCount(callout: ICallout): Promise<number> {
    const result = 0;
    if (callout.type === CalloutType.CARD) {
      return await this.aspectService.getCardsInCalloutCount(callout.id);
    } else if (callout.type === CalloutType.CANVAS) {
      return await this.canvasService.getCanvasesInCalloutCount(callout.id);
    } else {
      const comments = await this.getCommentsFromCallout(callout.id);
      if (comments) {
        return comments.commentsCount;
      }
    }
    return result;
  }

  private async setNameIdOnAspectData(
    aspectData: CreateAspectOnCalloutInput,
    callout: ICallout
  ) {
    if (aspectData.nameID && aspectData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isAspectNameIdAvailableInCallout(
          aspectData.nameID,
          callout.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Aspect: the provided nameID is already taken: ${aspectData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      aspectData.nameID = this.namingService.createNameID(
        aspectData.profileData.displayName
      );
    }

    // Check that there isn't an aspect with the same title
    const displayName = aspectData.profileData.displayName;
    const existingAspect = callout.aspects?.find(
      aspect => aspect.profile.displayName === displayName
    );
    if (existingAspect)
      throw new ValidationException(
        `Already have an aspect with the provided display name: ${displayName}`,
        LogContext.COLLABORATION
      );
  }

  public async createAspectOnCallout(
    aspectData: CreateAspectOnCalloutInput,
    userID: string
  ): Promise<IAspect> {
    const calloutID = aspectData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['aspects', 'aspects.profile'],
    });
    if (!callout.aspects)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );

    await this.setNameIdOnAspectData(aspectData, callout);

    // Get the communicationGroupID to use for the aspect comments
    const communicationGroupID =
      await this.namingService.getCommunicationGroupIdForCallout(callout.id);

    const aspect = await this.aspectService.createAspect(
      aspectData,
      userID,
      communicationGroupID
    );
    callout.aspects.push(aspect);
    await this.calloutRepository.save(callout);
    return aspect;
  }

  private async setNameIdOnCanvasData(
    canvasData: CreateCanvasOnCalloutInput,
    callout: ICallout
  ) {
    if (canvasData.nameID && canvasData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isCanvasNameIdAvailableInCallout(
          canvasData.nameID,
          callout.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Canvas: the provided nameID is already taken: ${canvasData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      canvasData.nameID = this.namingService.createNameID(
        `${canvasData.profileData.displayName}`
      );
    }
  }

  public async createCanvasOnCallout(
    canvasData: CreateCanvasOnCalloutInput,
    userID: string
  ): Promise<ICanvas> {
    const calloutID = canvasData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['canvases'],
    });
    if (!callout.canvases)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );

    this.setNameIdOnCanvasData(canvasData, callout);

    const canvas = await this.canvasService.createCanvas(
      {
        nameID: canvasData.nameID,
        value: canvasData.value,
        profileData: canvasData.profileData,
      },
      userID
    );
    callout.canvases.push(canvas);
    await this.calloutRepository.save(callout);
    return canvas;
  }

  public async getCanvasesFromCallout(
    callout: ICallout,
    canvasIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<ICanvas[]> {
    const calloutLoaded = await this.getCalloutOrFail(callout.id, {
      relations: ['canvases'],
    });
    if (!calloutLoaded.canvases)
      throw new EntityNotFoundException(
        `Callout not initialised, no canvases: ${callout.id}`,
        LogContext.COLLABORATION
      );

    if (!canvasIDs) {
      const limitAndShuffled = limitAndShuffle(
        calloutLoaded.canvases,
        limit,
        shuffle
      );
      return limitAndShuffled;
    }
    const results: ICanvas[] = [];
    for (const canvasID of canvasIDs) {
      const canvas = calloutLoaded.canvases.find(
        canvas => canvas.id === canvasID || canvas.nameID === canvasID
      );
      if (!canvas) continue;
      results.push(canvas);
    }
    return results;
  }

  public async getCanvasFromCalloutOrFail(
    calloutID: string,
    canvasID: string
  ): Promise<ICanvas> {
    const canvas = await this.canvasService.getCanvasOrFail(canvasID, {
      relations: ['callout'],
    });
    const callout = (canvas as Canvas).callout;
    // check it is a canvas direction on a Callout
    if (!callout) {
      throw new NotSupportedException(
        `Not able to delete a Canvas that is not contained by Callout: ${canvasID}`,
        LogContext.COLLABORATION
      );
    }
    if (callout.id !== calloutID) {
      throw new NotSupportedException(
        `Canvas (${canvasID}) is not a child of supplied callout: ${calloutID}`,
        LogContext.COLLABORATION
      );
    }

    return canvas;
  }

  public async getAspectsFromCallout(
    callout: ICallout,
    relations: FindOptionsRelationByString = [],
    aspectIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<IAspect[]> {
    const loadedCallout = await this.getCalloutOrFail(callout.id, {
      relations: ['aspects', ...relations],
    });
    if (!loadedCallout.aspects) {
      throw new EntityNotFoundException(
        `Context not initialised: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }
    if (!aspectIDs) {
      const limitAndShuffled = limitAndShuffle(
        loadedCallout.aspects,
        limit,
        shuffle
      );
      const sortedAspects = limitAndShuffled.sort((a, b) =>
        a.nameID.toLowerCase() > b.nameID.toLowerCase() ? 1 : -1
      );
      return sortedAspects;
    }
    const results: IAspect[] = [];
    for (const aspectID of aspectIDs) {
      const aspect = loadedCallout.aspects.find(
        aspect =>
          aspect.id === aspectID || aspect.nameID === aspectID.toLowerCase()
      );
      if (!aspect) continue;
      // toDo - in order to have this flow as 'exceptional' the client need to query only aspects in callouts the aspects
      // are. Currently, with the latest set of changes, callouts can be a list and without specifying the correct one in the query,
      // errors will be thrown.

      // throw new EntityNotFoundException(
      //   `Aspect with requested ID (${aspectID}) not located within current Callout: ${callout.id}`,
      //   LogContext.COLLABORATION
      // );
      results.push(aspect);
    }

    return results;
  }

  public async getApectFromCalloutOrFail(
    calloutID: string,
    aspectID: string
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(aspectID, {
      relations: ['callout'],
    });
    const callout = (aspect as Aspect).callout;
    // check it is a canvas direction on a Callout
    if (!callout) {
      throw new NotSupportedException(
        `Not able to delete a Canvas that is not contained by Callout: ${aspectID}`,
        LogContext.COLLABORATION
      );
    }
    if (callout.id !== calloutID) {
      throw new NotSupportedException(
        `Canvas (${aspectID}) is not a child of supplied callout: ${calloutID}`,
        LogContext.COLLABORATION
      );
    }

    return aspect;
  }

  public async getCommentsFromCallout(
    calloutID: string
  ): Promise<IComments | undefined> {
    const loadedCallout = await this.getCalloutOrFail(calloutID, {
      relations: ['comments'],
    });
    return loadedCallout.comments;
  }

  public async getCardTemplateFromCallout(
    calloutID: string
  ): Promise<IAspectTemplate | undefined> {
    const loadedCallout = await this.getCalloutOrFail(calloutID, {
      relations: ['cardTemplate'],
    });
    return loadedCallout.cardTemplate;
  }
  public async getCanvasTemplateFromCallout(
    calloutID: string
  ): Promise<ICanvasTemplate | undefined> {
    const loadedCallout = await this.getCalloutOrFail(calloutID, {
      relations: ['canvasTemplate'],
    });
    return loadedCallout.canvasTemplate;
  }
}
