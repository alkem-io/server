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
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { NamingService } from '@src/services/domain/naming/naming.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CreateCalloutOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.callout';
import { CreateRelationOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.relation';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutState } from '@common/enums/callout.state';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { RelationService } from '@domain/collaboration/relation/relation.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private relationService: RelationService,
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

  async updateCollaboration(
    collaborationInput: UpdateNameableInput
  ): Promise<ICollaboration> {
    const collaboration = await this.getCollaborationOrFail(
      collaborationInput.ID
    );

    return await this.collaborationRepository.save(collaboration);
  }

  async removeCollaboration(collaborationID: string): Promise<ICollaboration> {
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['callouts'],
    });

    if (collaboration.callouts) {
      for (const callout of collaboration.callouts) {
        await this.calloutService.removeCallout(callout.id);
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

  async createCalloutOnCollaboration(
    calloutData: CreateCalloutOnCollaborationInput
  ): Promise<ICallout> {
    const collaborationID = calloutData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['canvasCallouts'],
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

    const callout = await this.calloutService.createCallout({
      displayName: calloutData.displayName,
      nameID: calloutData.nameID,
      type: CalloutType.CANVAS,
      state: CalloutState.OPEN,
      visibility: CalloutVisibility.DRAFT,
    });
    collaboration.callouts.push(callout);
    await this.collaborationRepository.save(collaboration);
    return callout;
  }

  async getCalloutsOnCollaboration(
    collaboration: ICollaboration,
    calloutIDs?: string[]
  ): Promise<ICallout[]> {
    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['canvasCallouts'],
      }
    );
    if (!collaborationLoaded.callouts)
      throw new EntityNotFoundException(
        `Collaboration not initialised, no canvas callouts: ${collaboration.id}`,
        LogContext.CONTEXT
      );

    if (!calloutIDs) {
      return collaborationLoaded.callouts;
    }
    const results: ICallout[] = [];
    for (const calloutID of calloutIDs) {
      const callout = collaborationLoaded.callouts.find(
        callout => callout.id === calloutID
      );

      if (!callout)
        throw new EntityNotFoundException(
          `Callout with requested ID (${calloutID}) not located within current Collaboration: : ${collaboration.id}`,
          LogContext.CONTEXT
        );
      results.push(callout);
    }
    return results;
  }

  async createRelationOnCollaboration(
    relationData: CreateRelationOnCollaborationInput
  ): Promise<IRelation> {
    const collaborationId = relationData.parentID;
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

  // Loads the relations into the Collaboration entity if not already present
  async getRelationsOnCollaboration(
    collaboration: Collaboration
  ): Promise<IRelation[]> {
    if (collaboration.relations && collaboration.relations.length > 0) {
      return collaboration.relations;
    }

    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['relations'],
      }
    );

    if (!collaborationLoaded.relations)
      throw new EntityNotInitializedException(
        `Collaboration not initialised: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    return collaborationLoaded.relations;
  }
}
