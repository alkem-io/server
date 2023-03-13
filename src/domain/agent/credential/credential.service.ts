import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  Credential,
  CreateCredentialInput,
  ICredential,
  CredentialsSearchInput,
} from '@domain/agent/credential';
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
}
