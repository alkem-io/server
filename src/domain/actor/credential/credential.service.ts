import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
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
