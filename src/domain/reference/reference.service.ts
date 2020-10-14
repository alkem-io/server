import { Injectable } from '@nestjs/common';
import { ReferenceInput } from './reference.dto';
import { Reference } from './reference.entity';
import { IReference } from './reference.interface';

@Injectable()
export class ReferenceService {
  async replaceReferences(
    origReferences: IReference[],
    newReferences: ReferenceInput[]
  ): Promise<IReference[]> {
    if (!origReferences)
      throw new Error('Null references array passed in for replacing');
    if (newReferences) {
      // Clear the existing array
      origReferences.length = 0;
      for (const reference of newReferences) {
        const newRef = new Reference(
          reference.name,
          reference.uri,
          reference.description
        );
        origReferences.push(newRef);
      }
    }

    return origReferences;
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
