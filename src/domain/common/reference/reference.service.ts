import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateReferenceInput } from './reference.dto.create';
import { Reference } from './reference.entity';
import { IReference } from './reference.interface';
import { UpdateReferenceInput } from '@domain/common/reference';
import { RemoveEntityInput } from '../entity.dto.remove';

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

  updateReferenceValues(
    reference: IReference,
    referenceData: UpdateReferenceInput
  ) {
    // Copy over the received data if a uri is supplied
    if (referenceData.uri) {
      reference.uri = referenceData.uri;
    }

    if (referenceData.name) {
      reference.name = referenceData.name;
    }

    if (referenceData.description) {
      reference.description = referenceData.description;
    } else {
      reference.description = '';
    }
  }

  async updateReference(
    referenceData: UpdateReferenceInput
  ): Promise<IReference> {
    const reference = await this.getReferenceOrFail(referenceData.ID);
    this.updateReferenceValues(reference, referenceData);

    return await this.referenceRepository.save(reference);
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

  async removeReference(removeData: RemoveEntityInput): Promise<IReference> {
    const referenceID = removeData.ID;
    const reference = await this.getReferenceOrFail(referenceID);
    const { id } = reference;
    const result = await this.referenceRepository.remove(
      reference as Reference
    );
    return {
      ...result,
      id,
    };
  }

  async updateReferences(
    references: IReference[],
    updateReferenceDTOs: UpdateReferenceInput[] | undefined,
    createReferenceDTOs: CreateReferenceInput[] | undefined
  ) {
    if (updateReferenceDTOs) {
      for (const referenceDTO of updateReferenceDTOs) {
        const referenceID = referenceDTO.ID;
        const existingReference = references.find(
          reference => reference.id === referenceID
        );
        if (!existingReference)
          throw new EntityNotFoundException(
            `Not able to locate reference with the specified ID: ${referenceID} in existing references`,
            LogContext.CHALLENGES
          );
        await this.updateReferenceValues(existingReference, referenceDTO);
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
