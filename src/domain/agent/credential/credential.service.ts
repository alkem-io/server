import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import {
  CreateCredentialInput,
  Credential,
  CredentialsSearchInput,
  ICredential,
} from '@domain/agent/credential';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private credentialRepository: Repository<Credential>
  ) {}

  async createCredential(
    credentialInput: CreateCredentialInput
  ): Promise<ICredential> {
    const credential = Credential.create({ ...credentialInput });
    await this.credentialRepository.save(credential);
    return credential;
  }

  public async save(credential: ICredential): Promise<ICredential> {
    return await this.credentialRepository.save(credential);
  }

  async getCredentialOrFail(credentialID: string): Promise<ICredential> {
    const credential = await this.credentialRepository.findOneBy({
      id: credentialID,
    });
    if (!credential)
      throw new EntityNotFoundException(
        `Not able to locate credential with the specified ID: ${credentialID}`,
        LogContext.AUTH
      );
    return credential;
  }

  async deleteCredential(credentialID: string): Promise<ICredential> {
    const credential = await this.getCredentialOrFail(credentialID);
    const result = await this.credentialRepository.remove(
      credential as Credential
    );
    result.id = credentialID;
    return result;
  }

  async findMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<Credential[]> {
    if (!credentialCriteria.resourceID) {
      const credentialMatches = await this.credentialRepository
        .createQueryBuilder('credential')
        .leftJoinAndSelect('credential.agent', 'agent')
        .where({
          type: `${credentialCriteria.type}`,
        })
        .getMany();
      return credentialMatches;
    } else {
      const credentialMatches = await this.credentialRepository
        .createQueryBuilder('credential')
        .leftJoinAndSelect('credential.agent', 'agent')
        .where({
          type: `${credentialCriteria.type}`,
          resourceID: `${credentialCriteria.resourceID}`,
        })
        .getMany();
      return credentialMatches;
    }
  }

  async countMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    if (!credentialCriteria.resourceID) {
      return await this.credentialRepository
        .createQueryBuilder('credential')
        .leftJoinAndSelect('credential.agent', 'agent')
        .where({
          type: `${credentialCriteria.type}`,
        })
        .getCount();
    }
    return await this.credentialRepository
      .createQueryBuilder('credential')
      .leftJoinAndSelect('credential.agent', 'agent')
      .where({
        type: `${credentialCriteria.type}`,
        resourceID: `${credentialCriteria.resourceID}`,
      })
      .getCount();
  }

  /**
   * Batch-counts matching credentials for multiple (type, resourceID) pairs
   * in a single grouped query. Returns a Map keyed by resourceID.
   */
  async countMatchingCredentialsBatch(
    criteriaList: CredentialsSearchInput[]
  ): Promise<Map<string, number>> {
    if (criteriaList.length === 0) {
      return new Map();
    }

    const resourceIDs = criteriaList
      .map(c => c.resourceID)
      .filter((id): id is string => !!id);

    if (resourceIDs.length === 0) {
      return new Map();
    }

    // All criteria should share the same type for member counts
    const type = criteriaList[0].type;

    const results = await this.credentialRepository
      .createQueryBuilder('credential')
      .select('credential.resourceID', 'resourceID')
      .addSelect('COUNT(*)', 'count')
      .where('credential.type = :type', { type })
      .andWhere('credential.resourceID IN (:...resourceIDs)', { resourceIDs })
      .groupBy('credential.resourceID')
      .getRawMany<{ resourceID: string; count: string }>();

    const countsMap = new Map<string, number>();
    for (const row of results) {
      countsMap.set(row.resourceID, parseInt(row.count, 10));
    }
    return countsMap;
  }
}
