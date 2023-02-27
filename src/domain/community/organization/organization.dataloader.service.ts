import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const organizations = await this.organizationRepository.findByIds(
      organizationIds,
      {
        relations: ['profile'],
        select: ['id'],
      }
    );

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
