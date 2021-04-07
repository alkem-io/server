import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateReferenceInput } from './reference.dto.create';
import { Reference } from './reference.entity';
import { IReference } from './reference.interface';
import { UpdateReferenceInput } from '@domain/common/reference';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>
  ) {}

  async createReference(
    referenceInput: CreateReferenceInput
  ): Promise<IReference> {
    const reference = new Reference(
      referenceInput.name,
      referenceInput.uri || '',
      referenceInput.description
    );
    await this.referenceRepository.save(reference);
    return reference;
  }

  async updateReference(
    referenceData: UpdateReferenceInput
  ): Promise<IReference> {
    const reference = await this.getReferenceOrFail(referenceData.ID);
    // Copy over the received data if a uri is supplied
    if (referenceData.uri) {
      reference.uri = referenceData.uri;
    }

    if (referenceData.description) {
      reference.description = referenceData.description;
    } else {
      reference.description = '';
    }

    const updatedReference = await this.referenceRepository.save(reference);

    return updatedReference;
  }

  async getReferenceOrFail(referenceID: number): Promise<IReference> {
    const reference = await this.referenceRepository.findOne({
      id: referenceID,
    });
    if (!reference)
      throw new EntityNotFoundException(
        `Not able to locate reference with the specified ID: ${referenceID}`,
        LogContext.CHALLENGES
      );
    return reference;
  }

  async removeReference(referenceID: number): Promise<IReference> {
    const reference = await this.getReferenceOrFail(referenceID);
    return await this.referenceRepository.remove(reference as Reference);
  }

  async updateReferences(
    references: IReference[],
    updateReferenceDTOs: UpdateReferenceInput[] | undefined,
    createReferenceDTOs: CreateReferenceInput[] | undefined
  ) {
    if (updateReferenceDTOs) {
      for (const referenceDTO of updateReferenceDTOs) {
        await this.updateReference(referenceDTO);
      }
    }
    if (createReferenceDTOs) {
      for (const createReferenceData of createReferenceDTOs) {
        const reference = await this.createReference(createReferenceData);
        references.push(reference);
      }
    }
  }
}
