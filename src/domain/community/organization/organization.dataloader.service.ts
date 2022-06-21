import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const organizations = await this.organizationRepository.findByIds(
      organizationIds,
      {
        relations: ['profile'],
        select: ['id'],
      }
    );

    const results = organizations.filter(user =>
      organizationIds.includes(user.id)
    );
    const mappedResults = organizationIds.map(
      id =>
        results.find(result => result.id === id)?.profile ||
        new Error(`Could not load user ${id}`)
    );
    return mappedResults;
  }
}
