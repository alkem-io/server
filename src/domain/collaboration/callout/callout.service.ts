import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
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
import { NamingService } from '@src/services/domain/naming/naming.service';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';

@Injectable()
export class CalloutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    private namingService: NamingService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput
  ): Promise<ICallout> {
    const callout: ICallout = Callout.create(calloutData);
    callout.authorization = new AuthorizationPolicy();
    return callout;
  }

  public async getCalloutOrFail(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout> {
    let callout: ICallout | undefined;
    if (calloutID.length === UUID_LENGTH) {
      callout = await this.calloutRepository.findOne(
        { id: calloutID },
        options
      );
    }
    if (!callout) {
      // look up based on nameID
      callout = await this.calloutRepository.findOne(
        { nameID: calloutID },
        options
      );
    }
    if (!callout)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${calloutID}`,
        LogContext.COLLABORATION
      );
    return callout;
  }

  public async updateCallout(
    calloutUpdateData: UpdateCalloutInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutUpdateData.ID);

    if (calloutUpdateData.description)
      callout.description = calloutUpdateData.description;

    if (calloutUpdateData.type) callout.type = calloutUpdateData.type;

    if (calloutUpdateData.state) callout.state = calloutUpdateData.state;

    if (calloutUpdateData.visibility)
      callout.visibility = calloutUpdateData.visibility;

    return await this.calloutRepository.save(callout);
  }

  public async deleteCallout(calloutID: string): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['aspects', 'canvases'],
    });

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

    if (callout.authorization)
      await this.authorizationPolicyService.delete(callout.authorization);

    return await this.calloutRepository.remove(callout as Callout);
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
        aspectData.displayName || `${aspectData.type}`
      );
    }

    // Check that there isn't an aspect with the same title
    const displayName = aspectData.displayName;
    const existingAspect = callout.aspects?.find(
      aspect => aspect.displayName === displayName
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
      relations: ['aspects'],
    });
    if (!callout.aspects)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );

    await this.setNameIdOnAspectData(aspectData, callout);

    // Not idea: get the communicationGroupID to use for the comments
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
        `${canvasData.displayName}`
      );
    }
  }

  public async createCanvasOnCallout(
    canvasData: CreateCanvasOnCalloutInput
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

    const canvas = await this.canvasService.createCanvas({
      displayName: canvasData.displayName,
      nameID: canvasData.nameID,
      value: canvasData.value,
    });
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
        canvas => canvas.id === canvasID
      );
      if (!canvas)
        throw new EntityNotFoundException(
          `Canvas with requested ID (${canvasID}) not located within current Callout: : ${callout.id}`,
          LogContext.COLLABORATION
        );
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
    aspectIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<IAspect[]> {
    const loadedCallout = await this.getCalloutOrFail(callout.id, {
      relations: ['aspects'],
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
        a.displayName.toLowerCase() > b.displayName.toLowerCase() ? 1 : -1
      );
      return sortedAspects;
    }
    const results: IAspect[] = [];
    for (const aspectID of aspectIDs) {
      const aspect = loadedCallout.aspects.find(
        aspect =>
          aspect.id === aspectID || aspect.nameID === aspectID.toLowerCase()
      );
      if (!aspect)
        throw new EntityNotFoundException(
          `Aspect with requested ID (${aspectID}) not located within current Callout: ${callout.id}`,
          LogContext.COLLABORATION
        );
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
}
