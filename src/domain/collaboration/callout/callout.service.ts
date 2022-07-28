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

  async createCallout(calloutData: CreateCalloutInput): Promise<ICallout> {
    const callout: ICallout = Callout.create(calloutData);
    callout.authorization = new AuthorizationPolicy();
    return callout;
  }

  async getCalloutOrFail(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout> {
    const callout = await this.calloutRepository.findOne(
      { id: calloutID },
      options
    );
    if (!callout)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${calloutID}`,
        LogContext.CONTEXT
      );
    return callout;
  }

  async updateCallout(calloutInput: UpdateCalloutInput): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutInput.ID);

    return await this.calloutRepository.save(callout);
  }

  async removeCallout(calloutID: string): Promise<ICallout> {
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

  private async setDisplayNameOnAspectData(
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
        LogContext.CONTEXT
      );
  }

  async createAspectOnCallout(
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
        LogContext.CONTEXT
      );

    await this.setDisplayNameOnAspectData(aspectData, callout);

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

  async createCanvasOnCallout(
    canvasData: CreateCanvasOnCalloutInput
  ): Promise<ICanvas> {
    const calloutID = canvasData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['canvases'],
    });
    if (!callout.canvases)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.CONTEXT
      );

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

    const canvas = await this.canvasService.createCanvas({
      displayName: canvasData.displayName,
      nameID: canvasData.nameID,
      value: canvasData.value,
    });
    callout.canvases.push(canvas);
    await this.calloutRepository.save(callout);
    return canvas;
  }

  async getCanvasesListOnCallout(
    callout: ICallout,
    canvasIDs?: string[]
  ): Promise<ICanvas[]> {
    const calloutLoaded = await this.getCalloutOrFail(callout.id, {
      relations: ['canvases'],
    });
    if (!calloutLoaded.canvases)
      throw new EntityNotFoundException(
        `Callout not initialised, no canvases: ${callout.id}`,
        LogContext.CONTEXT
      );

    if (!canvasIDs) {
      return calloutLoaded.canvases;
    }
    const results: ICanvas[] = [];
    for (const canvasID of canvasIDs) {
      const canvas = calloutLoaded.canvases.find(
        canvas => canvas.id === canvasID
      );
      if (!canvas)
        throw new EntityNotFoundException(
          `Canvas with requested ID (${canvasID}) not located within current Callout: : ${callout.id}`,
          LogContext.CONTEXT
        );
      results.push(canvas);
    }
    return results;
  }

  async getCanvasOnCalloutOrFail(
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
        LogContext.CONTEXT
      );
    }
    if (callout.id !== calloutID) {
      throw new NotSupportedException(
        `Canvas (${canvasID}) is not a child of supplied callout: ${calloutID}`,
        LogContext.CONTEXT
      );
    }

    return canvas;
  }

  async getAspectsListOnCallout(
    callout: ICallout,
    aspectIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<IAspect[]> {
    const contextLoaded = await this.getCalloutOrFail(callout.id, {
      relations: ['aspects'],
    });
    if (!contextLoaded.aspects) {
      throw new EntityNotFoundException(
        `Context not initialised: ${callout.id}`,
        LogContext.CONTEXT
      );
    }
    if (!aspectIDs) {
      const limitAndShuffled = limitAndShuffle(
        contextLoaded.aspects,
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
      const aspect = contextLoaded.aspects.find(
        aspect =>
          aspect.id === aspectID || aspect.nameID === aspectID.toLowerCase()
      );
      if (!aspect)
        throw new EntityNotFoundException(
          `Aspect with requested ID (${aspectID}) not located within current Context: : ${callout.id}`,
          LogContext.CONTEXT
        );
      results.push(aspect);
    }

    return results;
  }

  async getApectOnCalloutOrFail(
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
        LogContext.CONTEXT
      );
    }
    if (callout.id !== calloutID) {
      throw new NotSupportedException(
        `Canvas (${aspectID}) is not a child of supplied callout: ${calloutID}`,
        LogContext.CONTEXT
      );
    }

    return aspect;
  }
}
