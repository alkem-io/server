import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateRelationInput } from './relation.dto.create';
import { Relation } from './relation.entity';
import { IRelation } from './relation.interface';
import { DeleteRelationInput } from './relation.dto.delete';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';

const allowedRelationTypes = ['incoming', 'outgoing'];

@Injectable()
export class RelationService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    @InjectRepository(Relation)
    private relationRepository: Repository<Relation>
  ) {}

  async createRelation(relationData: CreateRelationInput): Promise<IRelation> {
    // Check that the relation type is valie
    if (!allowedRelationTypes.includes(relationData.type))
      throw new RelationshipNotFoundException(
        `Invalid relation type supplied: ${relationData.type}`,
        LogContext.CHALLENGES
      );
    const relation = Relation.create(relationData);
    relation.authorization = new AuthorizationDefinition();

    // to do: set the rest of the fields
    await this.relationRepository.save(relation);
    return relation;
  }

  async updateRelation(
    relation: Relation,
    relationData: CreateRelationInput
  ): Promise<boolean> {
    // Copy over the received data
    if (relationData.actorName) {
      relation.actorName = relationData.actorName;
    }

    if (relationData.description) {
      relation.description = relationData.description;
    } else {
      relation.description = '';
    }

    await this.relationRepository.save(relation);

    return true;
  }

  async getRelationOrFail(relationID: string): Promise<IRelation> {
    const relation = await this.relationRepository.findOne({ id: relationID });
    if (!relation)
      throw new EntityNotFoundException(
        `Not able to locate relation with the specified ID: ${relationID}`,
        LogContext.CHALLENGES
      );
    return relation;
  }

  async deleteRelation(deleteData: DeleteRelationInput): Promise<IRelation> {
    const relationID = deleteData.ID;
    const relation = await this.getRelationOrFail(relationID);

    if (relation.authorization)
      await this.authorizationDefinitionService.delete(relation.authorization);

    const { id } = relation;
    const result = await this.relationRepository.remove(relation as Relation);
    return {
      ...result,
      id,
    };
  }

  async saveRelation(relation: IRelation): Promise<IRelation> {
    return await this.relationRepository.save(relation);
  }
}
