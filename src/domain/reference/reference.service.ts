import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  createReference(referenceInput: ReferenceInput): IReference {
    const reference = new Reference(
      referenceInput.name,
      referenceInput.uri,
      referenceInput.description
    );
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
}
