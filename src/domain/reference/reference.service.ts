import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
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
    reference: IReference,
    referenceData: ReferenceInput
  ): Promise<IReference> {
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

    const updatedReference = await this.referenceRepository.save(reference);

    return updatedReference;
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
    await this.referenceRepository.delete(referenceID);
    return true;
  }

  async updateReferences(
    references: IReference[],
    referenceDTOs: ReferenceInput[]
  ) {
    for (const referenceDTO of referenceDTOs) {
      if (!references.some(({ name }) => name === referenceDTO.name))
        references.push(
          new Reference(
            referenceDTO.name,
            referenceDTO.uri,
            referenceDTO?.description
          )
        );
      else {
        const reference = await references.find(
          e => e.name === referenceDTO.name
        );
        await this.updateReference(reference as IReference, referenceDTO);
      }
    }
  }
}
