import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '../../utils/error-handling/exceptions/entity.not.found.exception';
import { LogContext } from '../../utils/logging/logging.contexts';
import { ReferenceInput } from './reference.dto';
import { Reference } from './reference.entity';
import { IReference } from './reference.interface';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>
  ) {}

  convertReferences(newReferences: ReferenceInput[]): IReference[] {
    const references = [];
    if (newReferences) {
      for (const reference of newReferences) {
        const newRef = new Reference(
          reference.name,
          reference.uri,
          reference.description
        );
        references.push(newRef);
      }
    }

    return references;
  }

  async createReference(referenceInput: ReferenceInput): Promise<IReference> {
    const reference = new Reference(
      referenceInput.name,
      referenceInput.uri,
      referenceInput.description
    );
    await this.referenceRepository.save(reference);
    return reference;
  }

  async updateReference(
    reference: Reference,
    referenceData: ReferenceInput
  ): Promise<boolean> {
    // Copy over the received data
    if (referenceData.uri) {
      reference.uri = referenceData.uri;
    } else {
      reference.uri = '';
    }

    if (referenceData.description) {
      reference.description = referenceData.description;
    } else {
      reference.description = '';
    }

    await this.referenceRepository.save(reference);

    return true;
  }

  async getReference(referenceID: number): Promise<IReference | undefined> {
    return await this.referenceRepository.findOne({ id: referenceID });
  }

  async removeReference(referenceID: number): Promise<boolean> {
    const reference = await this.getReference(referenceID);
    if (!reference)
      throw new EntityNotFoundException(
        `Not able to locate reference with the specified ID: ${referenceID}`,
        LogContext.CHALLENGES
      );
    await this.referenceRepository.remove(reference as Reference);
    return true;
  }
}
