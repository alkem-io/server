import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  UpdateReferenceInput,
  CreateReferenceInput,
  DeleteReferenceInput,
  Reference,
  IReference,
} from '@domain/common/reference';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { AuthorizationDefinitionService } from '../authorization-definition/authorization.definition.service';

@Injectable()
export class ReferenceService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
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
    reference.authorization = new AuthorizationDefinition();
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

  updateReferences(
    references: IReference[] | undefined,
    referencesData: UpdateReferenceInput[]
  ): IReference[] {
    if (!references)
      throw new EntityNotFoundException(
        'Not able to locate refernces',
        LogContext.CHALLENGES
      );
    if (referencesData) {
      for (const referenceData of referencesData) {
        // check the reference being update is part of the current entity
        const reference = references.find(
          reference => reference.id === referenceData.ID
        );
        if (!reference)
          throw new EntityNotFoundException(
            `Unable to update reference with supplied ID: ${referenceData.ID} - no reference in parent entity.`,
            LogContext.CHALLENGES
          );
        this.updateReferenceValues(reference, referenceData);
      }
    }
    return references;
  }

  async getReferenceOrFail(referenceID: string): Promise<IReference> {
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

  async deleteReference(deleteData: DeleteReferenceInput): Promise<IReference> {
    const referenceID = deleteData.ID;
    const reference = await this.getReferenceOrFail(referenceID);

    if (reference.authorization)
      await this.authorizationDefinitionService.delete(reference.authorization);

    const { id } = reference;
    const result = await this.referenceRepository.remove(
      reference as Reference
    );
    return {
      ...result,
      id,
    };
  }

  async saveReference(reference: IReference): Promise<IReference> {
    return await this.referenceRepository.save(reference);
  }
}
