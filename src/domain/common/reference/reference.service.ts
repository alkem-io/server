import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import {
  CreateReferenceInput,
  DeleteReferenceInput,
  IReference,
  Reference,
  UpdateReferenceInput,
} from '../reference';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { references } from './reference.schema';

@Injectable()
export class ReferenceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
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
    if (reference.id) {
      const [updated] = await this.db
        .update(references)
        .set({
          name: reference.name,
          uri: reference.uri,
          description: reference.description,
        })
        .where(eq(references.id, reference.id))
        .returning();
      return updated as unknown as IReference;
    } else {
      const [inserted] = await this.db
        .insert(references)
        .values({
          id: reference.id,
          name: reference.name,
          uri: reference.uri,
          description: reference.description,
          authorizationId: reference.authorization?.id,
        })
        .returning();
      return inserted as unknown as IReference;
    }
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

    const [updated] = await this.db
      .update(references)
      .set({
        name: reference.name,
        uri: reference.uri,
        description: reference.description,
      })
      .where(eq(references.id, reference.id))
      .returning();
    return updated as unknown as IReference;
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

  async getReferenceOrFail(referenceID: string): Promise<IReference | never> {
    const reference = await this.db.query.references.findFirst({
      where: eq(references.id, referenceID),
    });
    if (!reference)
      throw new EntityNotFoundException(
        `Not able to locate reference with the specified ID: ${referenceID}`,
        LogContext.SPACES
      );
    return reference as unknown as IReference;
  }

  async deleteReference(deleteData: DeleteReferenceInput): Promise<IReference> {
    const referenceID = deleteData.ID;
    const reference = await this.getReferenceOrFail(referenceID);

    if (reference.authorization)
      await this.authorizationPolicyService.delete(reference.authorization);

    await this.db.delete(references).where(eq(references.id, reference.id));
    return reference;
  }

  async saveReference(reference: IReference): Promise<IReference> {
    if (reference.id) {
      const [updated] = await this.db
        .update(references)
        .set({
          name: reference.name,
          uri: reference.uri,
          description: reference.description,
        })
        .where(eq(references.id, reference.id))
        .returning();
      return updated as unknown as IReference;
    } else {
      const [inserted] = await this.db
        .insert(references)
        .values({
          id: reference.id,
          name: reference.name,
          uri: reference.uri,
          description: reference.description,
          authorizationId: reference.authorization?.id,
        })
        .returning();
      return inserted as unknown as IReference;
    }
  }
}
