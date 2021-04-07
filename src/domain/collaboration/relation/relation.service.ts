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
import { RemoveEntityInput } from '@domain/common/entity.dto.remove';

const allowedRelationTypes = ['incoming', 'outgoing'];

@Injectable()
export class RelationService {
  constructor(
    @InjectRepository(Relation)
    private relationRepository: Repository<Relation>
  ) {}

  async createRelation(relationData: CreateRelationInput): Promise<IRelation> {
    const relation = new Relation();
    // Check that the relation type is valie
    if (!allowedRelationTypes.includes(relationData.type))
      throw new RelationshipNotFoundException(
        `Invalid relation type supplied: ${relationData.type}`,
        LogContext.CHALLENGES
      );
    relation.type = relationData.type;
    relation.description = relationData.description;
    relation.actorName = relationData.actorName;
    relation.actorType = relationData.actorType;
    relation.actorRole = relationData.actorRole;

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

  async getRelationOrFail(relationID: number): Promise<IRelation> {
    const relation = await this.relationRepository.findOne({ id: relationID });
    if (!relation)
      throw new EntityNotFoundException(
        `Not able to locate relation with the specified ID: ${relationID}`,
        LogContext.CHALLENGES
      );
    return relation;
  }

  async removeRelation(removeData: RemoveEntityInput): Promise<IRelation> {
    const relationID = removeData.ID;
    const relation = await this.getRelationOrFail(relationID);

    const { id } = relation;
    const result = await this.relationRepository.remove(relation as Relation);
    return {
      ...result,
      id,
    };
  }
}
