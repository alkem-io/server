import { LogContext } from '@common/enums';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { ISpaceAbout } from '@domain/space/space.about';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { getTableName } from '../../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { ILoader } from '../../../loader.interface';

/**
 * Custom DataLoader for SpaceAbout that eagerly loads authorization.
 *
 * Uses two flat queries instead of nested `with` to work around a Drizzle
 * 0.45.x bug in `mapColumnsInSQLToAlias` that crashes when using
 * `{ about: { with: { authorization: true } } }`.
 */
@Injectable()
export class SpaceAboutLoaderCreator implements DataLoaderCreator<ISpaceAbout> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(
    options: DataLoaderCreatorOptions<ISpaceAbout>
  ): ILoader<
    | ISpaceAbout
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  > {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    const tableName = getTableName(options.parentClassRef.name);

    return new DataLoader<
      string,
      | ISpaceAbout
      | null
      | EntityNotFoundException
      | ForbiddenAuthorizationPolicyException
    >(keys => this.batchLoad(keys, tableName, options), {
      cache: options?.cache,
      name: this.constructor.name,
    });
  }

  private async batchLoad(
    ids: readonly string[],
    tableName: string,
    options: DataLoaderCreatorOptions<ISpaceAbout>
  ): Promise<
    (
      | ISpaceAbout
      | null
      | EntityNotFoundException
      | ForbiddenAuthorizationPolicyException
    )[]
  > {
    if (ids.length === 0) return [];

    const table = (this.db.query as any)[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found in Drizzle schema`);
    }

    // Query 1: Load parents with about relation + parent authorization (flat)
    const parents = await table.findMany({
      where: (t: any) => inArray(t.id, [...ids]),
      with: { about: true, authorization: true },
    });

    // Collect authorizationIds from SpaceAbouts for batch loading
    const aboutAuthIds = new Set<string>();
    for (const parent of parents) {
      if (parent.about?.authorizationId) {
        aboutAuthIds.add(parent.about.authorizationId);
      }
    }

    // Query 2: Batch-load authorization policies for SpaceAbouts
    const authPolicies =
      aboutAuthIds.size > 0
        ? await this.db.query.authorizationPolicies.findMany({
            where: inArray(authorizationPolicies.id, [...aboutAuthIds]),
          })
        : [];
    const authById = new Map(authPolicies.map(a => [a.id, a]));

    // Attach authorization to each SpaceAbout
    const parentById = new Map<string, any>();
    for (const parent of parents) {
      if (parent.about?.authorizationId) {
        parent.about.authorization = authById.get(
          parent.about.authorizationId
        );
      }
      parentById.set(parent.id, parent);
    }

    // Return results in input order with authorization checks
    return [...ids].map(id => {
      const parent = parentById.get(id);
      if (!parent?.about) {
        return options?.resolveToNull
          ? null
          : new EntityNotFoundException(
              `Could not load relation 'about' for ${tableName}`,
              LogContext.DATA_LOADER,
              { id }
            );
      }

      // Check parent privilege if configured
      if (options.checkParentPrivilege) {
        try {
          options.authorize(parent, options.checkParentPrivilege);
        } catch (e) {
          if (e instanceof ForbiddenAuthorizationPolicyException) {
            return e;
          }
        }
      }

      const about = parent.about;

      // Check result privilege if configured
      if (options.checkResultPrivilege) {
        try {
          options.authorize(about, options.checkResultPrivilege);
        } catch (e) {
          if (e instanceof ForbiddenAuthorizationPolicyException) {
            return e;
          }
        }
      }

      return about;
    });
  }
}
