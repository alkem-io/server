import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import {
  CreateReferenceInput,
  DeleteReferenceInput,
  IReference,
  Reference,
  UpdateReferenceInput,
} from '../reference';

@Injectable()
export class ReferenceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>
  ) {}

  public createReference(referenceInput: CreateReferenceInput): IReference {
    const reference = new Reference(
      referenceInput.name,
      referenceInput.uri || '',
      referenceInput.description
    );
    reference.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.REFERENCE
    );

    return reference;
  }

  public async save(reference: IReference): Promise<IReference> {
    return await this.referenceRepository.save(reference);
  }

  updateReferenceValues(
    reference: IReference,
    referenceData: UpdateReferenceInput
  ) {
    if (referenceData.uri !== undefined) {
      reference.uri = referenceData.uri;
    }

    if (referenceData.name !== undefined) {
      reference.name = referenceData.name;
    }

    if (referenceData.description !== undefined) {
      reference.description = referenceData.description;
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
        'Not able to locate references',
        LogContext.SPACES
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
            LogContext.SPACES
          );
        this.updateReferenceValues(reference, referenceData);
      }
    }
    return references;
  }

  async getReferenceOrFail(
    referenceID: string,
    options?: FindOneOptions<Reference>
  ): Promise<IReference | never> {
    const reference = await this.referenceRepository.findOne({
      where: { id: referenceID },
      ...options,
    });
    if (!reference)
      throw new EntityNotFoundException(
        `Not able to locate reference with the specified ID: ${referenceID}`,
        LogContext.SPACES
      );
    return reference;
  }

  async deleteReference(deleteData: DeleteReferenceInput): Promise<IReference> {
    const referenceID = deleteData.ID;
    const reference = await this.getReferenceOrFail(referenceID);

    if (reference.authorization)
      await this.authorizationPolicyService.delete(reference.authorization);

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
