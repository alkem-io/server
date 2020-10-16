import { Injectable } from '@nestjs/common';
import { ReferenceInput } from './reference.dto';
import { Reference } from './reference.entity';
import { IReference } from './reference.interface';

@Injectable()
export class ReferenceService {
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
}
