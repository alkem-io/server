import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ICallout } from '../callout/callout.interface';
import { IRelation } from '../relation/relation.interface';
import { Collaboration } from './collaboration.entity';

@Injectable()
export class CollaborationDataloaderService {
  constructor(
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>
  ) {}

  public async findCalloutsByBatch(
    collaborationIds: string[]
  ): Promise<(ICallout[] | Error)[]> {
    const collaborations = await this.collaborationRepository.find({
      where: {
        id: In(collaborationIds),
      },
      relations: ['callouts'],
      select: ['id'],
    });

    return collaborationIds.map(
      id =>
        collaborations.find(callout => callout.id === id)?.callouts ||
        new EntityNotFoundException(
          `Could not load collaboration ${id}`,
          LogContext.COLLABORATION
        )
    );
  }

  public async findRelationsByBatch(
    collaborationIds: string[]
  ): Promise<(IRelation[] | Error)[]> {
    const collaborations = await this.collaborationRepository.find({
      where: {
        id: In(collaborationIds),
      },
      relations: ['relations'],
      select: ['id'],
    });

    return collaborationIds.map(
      id =>
        collaborations.find(callout => callout.id === id)?.relations ||
        new EntityNotFoundException(
          `Could not load collaboration ${id}`,
          LogContext.COLLABORATION
        )
    );
  }
}
