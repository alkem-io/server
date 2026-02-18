import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './credential.entity';
import { ICredential } from './credential.interface';
import { CreateCredentialInput } from './dto/credential.dto.create';
import { CredentialsSearchInput } from './dto/credentials.dto.search';

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
    return await this.credentialRepository.save(credential as Credential);
  }

  async getCredentialOrFail(credentialID: string): Promise<ICredential> {
    const credential = await this.credentialRepository.findOneBy({
      id: credentialID,
    });
    if (!credential)
      throw new EntityNotFoundException(
        'Not able to locate credential with the specified ID',
        LogContext.AUTH,
        { credentialID }
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

  /**
   * Find all credentials matching the search criteria.
   */
  async findMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<Credential[]> {
    if (!credentialCriteria.resourceID) {
      const credentialMatches = await this.credentialRepository
        .createQueryBuilder('credential')
        .leftJoinAndSelect('credential.actor', 'actor')
        .where({
          type: `${credentialCriteria.type}`,
        })
        .getMany();
      return credentialMatches;
    } else {
      const credentialMatches = await this.credentialRepository
        .createQueryBuilder('credential')
        .leftJoinAndSelect('credential.actor', 'actor')
        .where({
          type: `${credentialCriteria.type}`,
          resourceID: `${credentialCriteria.resourceID}`,
        })
        .getMany();
      return credentialMatches;
    }
  }

  /**
   * Count credentials matching the search criteria.
   */
  async countMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    if (!credentialCriteria.resourceID) {
      return await this.credentialRepository
        .createQueryBuilder('credential')
        .leftJoinAndSelect('credential.actor', 'actor')
        .where({
          type: `${credentialCriteria.type}`,
        })
        .getCount();
    }
    return await this.credentialRepository
      .createQueryBuilder('credential')
      .leftJoinAndSelect('credential.actor', 'actor')
      .where({
        type: `${credentialCriteria.type}`,
        resourceID: `${credentialCriteria.resourceID}`,
      })
      .getCount();
  }

  /**
   * Batch-count credentials matching multiple criteria.
   * Returns a Map from resourceID to count.
   */
  async countMatchingCredentialsBatch(
    criteriaList: CredentialsSearchInput[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (criteriaList.length === 0) return result;

    // Build a single query with OR conditions for efficiency
    const qb = this.credentialRepository.createQueryBuilder('credential');
    const orConditions: string[] = [];
    const params: Record<string, string> = {};

    for (let i = 0; i < criteriaList.length; i++) {
      const criteria = criteriaList[i];
      if (criteria.resourceID) {
        orConditions.push(
          `(credential.type = :type${i} AND credential.resourceID = :rid${i})`
        );
        params[`type${i}`] = criteria.type;
        params[`rid${i}`] = criteria.resourceID;
      } else {
        orConditions.push(`(credential.type = :type${i})`);
        params[`type${i}`] = criteria.type;
      }
    }

    const rows = await qb
      .select('credential.resourceID', 'resourceID')
      .addSelect('COUNT(*)', 'count')
      .where(orConditions.join(' OR '), params)
      .groupBy('credential.resourceID')
      .getRawMany<{ resourceID: string; count: string }>();

    for (const row of rows) {
      result.set(row.resourceID, parseInt(row.count, 10));
    }

    return result;
  }

  /**
   * Find credentials by actor ID.
   */
  async findCredentialsByActorId(actorId: string): Promise<Credential[]> {
    return await this.credentialRepository.find({
      where: { actorId },
    });
  }

  /**
   * Create a credential for an actor.
   */
  async createCredentialForActor(
    actorId: string,
    credentialInput: CreateCredentialInput
  ): Promise<ICredential> {
    const credential = Credential.create({
      ...credentialInput,
      actorId,
    });
    await this.credentialRepository.save(credential);
    return credential;
  }

  /**
   * Delete a credential by type and resourceID for a specific actor.
   */
  async deleteCredentialByTypeAndResource(
    actorId: string,
    type: string,
    resourceID: string
  ): Promise<boolean> {
    const result = await this.credentialRepository.delete({
      actorId,
      type,
      resourceID,
    });
    return (result.affected ?? 0) > 0;
  }
}
