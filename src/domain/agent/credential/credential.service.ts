import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import {
  CreateCredentialInput,
  Credential,
  CredentialsSearchInput,
  ICredential,
} from '@domain/agent/credential';
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { credentials } from './credential.schema';
import { eq, and, count, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
@Injectable()
export class CredentialService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  async createCredential(
    credentialInput: CreateCredentialInput
  ): Promise<ICredential> {
    const credential = Credential.create({ ...credentialInput });
    const [created] = await this.db
      .insert(credentials)
      .values({
        resourceID: credential.resourceID,
        type: credential.type,
        issuer: credential.issuer,
        expires: credential.expires,
      })
      .returning();
    return created as unknown as ICredential;
  }

  public async save(credential: ICredential): Promise<ICredential> {
    if (credential.id) {
      const [updated] = await this.db
        .update(credentials)
        .set({
          resourceID: credential.resourceID,
          type: credential.type,
          issuer: credential.issuer,
          expires: credential.expires,
          agentId: credential.agent?.id,
        })
        .where(eq(credentials.id, credential.id))
        .returning();
      return updated as unknown as ICredential;
    } else {
      const [created] = await this.db
        .insert(credentials)
        .values({
          resourceID: credential.resourceID,
          type: credential.type,
          issuer: credential.issuer,
          expires: credential.expires,
          agentId: credential.agent?.id,
        })
        .returning();
      return created as unknown as ICredential;
    }
  }

  async getCredentialOrFail(credentialID: string): Promise<ICredential> {
    const credential = await this.db.query.credentials.findFirst({
      where: eq(credentials.id, credentialID),
    });
    if (!credential)
      throw new EntityNotFoundException(
        `Not able to locate credential with the specified ID: ${credentialID}`,
        LogContext.AUTH
      );
    return credential as unknown as ICredential;
  }

  async deleteCredential(credentialID: string): Promise<ICredential> {
    const credential = await this.getCredentialOrFail(credentialID);
    await this.db.delete(credentials).where(eq(credentials.id, credentialID));
    return credential;
  }

  async findMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<Credential[]> {
    const whereCondition = credentialCriteria.resourceID
      ? and(
          eq(credentials.type, credentialCriteria.type),
          eq(credentials.resourceID, credentialCriteria.resourceID)
        )
      : eq(credentials.type, credentialCriteria.type);

    const credentialMatches = await this.db.query.credentials.findMany({
      where: whereCondition,
      with: {
        agent: true,
      },
    });
    return credentialMatches as unknown as Credential[];
  }

  async countMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const whereCondition = credentialCriteria.resourceID
      ? and(
          eq(credentials.type, credentialCriteria.type),
          eq(credentials.resourceID, credentialCriteria.resourceID)
        )
      : eq(credentials.type, credentialCriteria.type);

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(credentials)
      .where(whereCondition);

    return Number(result[0]?.count || 0);
  }

  /**
   * Batch-counts matching credentials for multiple (type, resourceID) pairs
   * in a single grouped query. Returns a Map keyed by resourceID.
   */
  async countMatchingCredentialsBatch(
    criteriaList: CredentialsSearchInput[]
  ): Promise<Map<string, number>> {
    if (criteriaList.length === 0) {
      return new Map();
    }

    const resourceIDs = criteriaList
      .map(c => c.resourceID)
      .filter((id): id is string => !!id);

    if (resourceIDs.length === 0) {
      return new Map();
    }

    // All criteria should share the same type for member counts
    const type = criteriaList[0].type;

    const results = await this.db
      .select({
        resourceID: credentials.resourceID,
        count: count(),
      })
      .from(credentials)
      .where(
        and(
          eq(credentials.type, type),
          inArray(credentials.resourceID, resourceIDs)
        )
      )
      .groupBy(credentials.resourceID);

    const countsMap = new Map<string, number>();
    for (const row of results) {
      countsMap.set(row.resourceID, row.count);
    }
    return countsMap;
  }
}
