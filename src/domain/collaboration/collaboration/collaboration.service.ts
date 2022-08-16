import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { NamingService } from '@src/services/domain/naming/naming.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CreateCalloutOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.callout';
import { CreateRelationOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.relation';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { RelationService } from '@domain/collaboration/relation/relation.service';
import { AspectService } from '../aspect/aspect.service';
import { CanvasService } from '@domain/common/canvas/canvas.service';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private relationService: RelationService,
    private aspectService: AspectService,
    private canvasService: CanvasService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  async createCollaboration(): Promise<ICollaboration> {
    const collaboration: ICollaboration = Collaboration.create();
    collaboration.relations = [];
    collaboration.callouts = [];
    collaboration.authorization = new AuthorizationPolicy();
    return collaboration;
  }

  async getCollaborationOrFail(
    collaborationID: string,
    options?: FindOneOptions<Collaboration>
  ): Promise<ICollaboration> {
    const collaboration = await this.collaborationRepository.findOne(
      { id: collaborationID },
      options
    );
    if (!collaboration)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${collaborationID}`,
        LogContext.CONTEXT
      );
    return collaboration;
  }

  public async deleteCollaboration(
    collaborationID: string
  ): Promise<ICollaboration> {
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['callouts'],
    });

    if (collaboration.callouts) {
      for (const callout of collaboration.callouts) {
        await this.calloutService.deleteCallout(callout.id);
      }
    }

    if (collaboration.relations) {
      for (const relation of collaboration.relations) {
        await this.relationService.deleteRelation({ ID: relation.id });
      }
    }

    if (collaboration.authorization)
      await this.authorizationPolicyService.delete(collaboration.authorization);

    return await this.collaborationRepository.remove(
      collaboration as Collaboration
    );
  }

  public async createCalloutOnCollaboration(
    calloutData: CreateCalloutOnCollaborationInput
  ): Promise<ICallout> {
    const collaborationID = calloutData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['callouts'],
    });
    if (!collaboration.callouts)
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationID}) not initialised`,
        LogContext.CONTEXT
      );

    if (calloutData.nameID && calloutData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isCalloutNameIdAvailableInCollaboration(
          calloutData.nameID,
          collaboration.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Callout: the provided nameID is already taken: ${calloutData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      calloutData.nameID = this.namingService.createNameID(
        `${calloutData.displayName}`
      );
    }

    const callout = await this.calloutService.createCallout(calloutData);
    collaboration.callouts.push(callout);
    await this.collaborationRepository.save(collaboration);
    return callout;
  }

  public async getCalloutsOnCollaboration(
    collaboration: ICollaboration
  ): Promise<ICallout[]> {
    const loadedCollaboration = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['callouts'],
      }
    );
    if (!loadedCollaboration.callouts)
      throw new EntityNotFoundException(
        `Callouts not initialised on collaboration: ${collaboration.id}`,
        LogContext.CONTEXT
      );

    return loadedCollaboration.callouts;
  }

  public async createRelationOnCollaboration(
    relationData: CreateRelationOnCollaborationInput
  ): Promise<IRelation> {
    const collaborationId = relationData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationId, {
      relations: ['relations'],
    });

    if (!collaboration.relations)
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationId}) not initialised`,
        LogContext.COLLABORATION
      );

    const relation = await this.relationService.createRelation(relationData);
    collaboration.relations.push(relation);
    await this.collaborationRepository.save(collaboration);
    return relation;
  }

  public async getRelationsOnCollaboration(
    collaboration: ICollaboration
  ): Promise<IRelation[]> {
    const loadedCollaboration = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['relations'],
      }
    );

    if (!loadedCollaboration.relations)
      throw new EntityNotInitializedException(
        `Collaboration not initialised: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    return loadedCollaboration.relations;
  }

  public async getAspectsCount(collaboration: ICollaboration): Promise<number> {
    const callouts = await this.getCalloutsOnCollaboration(collaboration);

    let aspectsCount = 0;
    for (const callout of callouts) {
      aspectsCount += await this.aspectService.getAspectsInCalloutCount(
        callout.id
      );
    }
    return aspectsCount;
  }

  public async getCanvasesCount(
    collaboration: ICollaboration
  ): Promise<number> {
    const callouts = await this.getCalloutsOnCollaboration(collaboration);
    let canvasesCount = 0;
    for (const callout of callouts) {
      canvasesCount += await this.canvasService.getCanvasesInCalloutCount(
        callout.id
      );
    }
    return canvasesCount;
  }

  public async getRelationsCount(
    collaboration: ICollaboration
  ): Promise<number> {
    const aspectsCount =
      await this.relationService.getRelationsInCollaborationCount(
        collaboration.id
      );

    return aspectsCount;
  }
}
