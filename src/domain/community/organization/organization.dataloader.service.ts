import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IProfile } from '..';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationDataloaderService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>
  ) {}

  public async findProfilesByBatch(
    organizationIds: string[]
  ): Promise<(IProfile | Error)[]> {
    const organizations = await this.organizationRepository.find({
      where: { id: In(organizationIds) },
      relations: ['profile'],
      select: ['id'],
    });

    const results = organizations.filter(org =>
      organizationIds.includes(org.id)
    );
    return organizationIds.map(
      id =>
        results.find(result => result.id === id)?.profile ||
        new EntityNotFoundException(
          `Could not load organization ${id}`,
          LogContext.COMMUNITY
        )
    );
  }
}
