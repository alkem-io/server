import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@src/common/error-handling/exceptions';
import { LogContext } from '@src/core/logging/logging.contexts';
import { RelationInput } from './relation.dto';
import { Relation } from './relation.entity';
import { IRelation } from './relation.interface';

const allowedRelationTypes = ['incoming', 'outgoing'];

@Injectable()
export class RelationService {
  constructor(
    @InjectRepository(Relation)
    private relationRepository: Repository<Relation>
  ) {}

  async createRelation(relationData: RelationInput): Promise<IRelation> {
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
    relationData: RelationInput
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

  async removeRelation(relationID: number): Promise<boolean> {
    await this.getRelationOrFail(relationID);

    await this.relationRepository.delete(relationID);
    return true;
  }
}
