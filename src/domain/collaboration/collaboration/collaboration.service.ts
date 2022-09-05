import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, getConnection, Repository } from 'typeorm';
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
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { collaborationDefaults } from './collaboration.defaults';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { CalloutType } from '@common/enums/callout.type';
import { CommentsService } from '@domain/communication/comments/comments.service';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private relationService: RelationService,
    private commentsService: CommentsService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  async createCollaboration(): Promise<ICollaboration> {
    const collaboration: ICollaboration = Collaboration.create();
    collaboration.authorization = new AuthorizationPolicy();
    collaboration.relations = [];
    collaboration.callouts = [];

    for (const calloutDefault of collaborationDefaults.callouts) {
      const callout = await this.calloutService.createCallout(calloutDefault);
      collaboration.callouts.push(callout);
    }
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

    const displayNameAvailable =
      await this.namingService.isCalloutDisplayNameAvailableInCollaboration(
        calloutData.displayName,
        collaboration.id
      );
    if (!displayNameAvailable)
      throw new ValidationException(
        `Unable to create Callout: the provided displayName is already taken: ${calloutData.displayName}`,
        LogContext.CHALLENGES
      );

    const callout = await this.calloutService.createCallout(calloutData);
    collaboration.callouts.push(callout);
    await this.collaborationRepository.save(collaboration);

    // If creating a discussionCallout, get the communicationGroupID to use for the callout comments
    if (calloutData.type === CalloutType.COMMENTS) {
      const communicationGroupID =
        await this.namingService.getCommunicationGroupIdForCallout(callout.id);

      callout.comments = await this.commentsService.createComments(
        communicationGroupID,
        `callout-comments-${callout.displayName}`
      );
    }
    await this.collaborationRepository.save(collaboration);

    return callout;
  }

  public async getCalloutsFromCollaboration(
    collaboration: ICollaboration,
    calloutIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<ICallout[]> {
    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['callouts'],
      }
    );
    if (!collaborationLoaded.callouts)
      throw new EntityNotFoundException(
        `Callout not initialised, no canvases: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    if (!calloutIDs) {
      const limitAndShuffled = limitAndShuffle(
        collaborationLoaded.callouts,
        limit,
        shuffle
      );
      return limitAndShuffled;
    }
    const results: ICallout[] = [];

    for (const calloutID of calloutIDs) {
      let callout;
      if (calloutID.length === UUID_LENGTH)
        callout = collaborationLoaded.callouts.find(
          callout => callout.id === calloutID
        );
      else
        callout = collaborationLoaded.callouts.find(
          callout => callout.nameID === calloutID
        );

      if (!callout)
        throw new EntityNotFoundException(
          `Callout with requested ID (${calloutID}) not located within current Collaboration: : ${collaboration.id}`,
          LogContext.COLLABORATION
        );
      results.push(callout);
    }
    return results;
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
    const [result]: {
      aspectsCount: number;
    }[] = await getConnection().query(
      `
      SELECT COUNT(*) as aspectsCount
      FROM \`collaboration\` RIGHT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      RIGHT JOIN \`aspect\` ON \`aspect\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`collaboration\`.\`id\` = '${collaboration.id}' AND \`callout\`.\`visibility\` = '${CalloutVisibility.PUBLISHED}';
      `
    );

    return result.aspectsCount;
  }

  public async getCanvasesCount(
    collaboration: ICollaboration
  ): Promise<number> {
    const [result]: {
      canvasesCount: number;
    }[] = await getConnection().query(
      `
      SELECT COUNT(*) as canvasesCount
      FROM \`collaboration\` RIGHT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      RIGHT JOIN \`canvas\` ON \`canvas\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`collaboration\`.\`id\` = '${collaboration.id}'  AND \`callout\`.\`visibility\` = '${CalloutVisibility.PUBLISHED}';
      `
    );

    return result.canvasesCount;
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

  public async getMembershipCredential(
    collaborationID: string
  ): Promise<CredentialDefinition> {
    return await this.namingService.getMembershipCredentialForCollaboration(
      collaborationID
    );
  }
}
