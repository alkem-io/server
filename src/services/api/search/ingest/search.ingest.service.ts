import { setTimeout } from 'node:timers/promises';
import { EntityManager, FindManyOptions } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import {
  ErrorCause,
  IndicesUpdateAliasesAction,
} from '@elastic/elasticsearch/lib/api/types';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Space } from '@domain/space/space/space.entity';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Tagset } from '@domain/common/tagset';
import { LogContext } from '@common/enums';
import { asyncReduceSequential } from '@common/utils/async.reduce.sequential';
import { asyncMap } from '@common/utils/async.map';
import { ElasticResponseError } from '@services/external/elasticsearch/types';
import { SpaceLevel } from '@common/enums/space.level';
import { getIndexPattern } from './get.index.pattern';
import { SearchResultType } from '../search.result.type';
import { ExcalidrawContent, isExcalidrawTextElement } from '@common/interfaces';
import { TaskService } from '@services/task';
import { Task } from '@services/task/task.interface';
import { AlkemioConfig } from '@src/types';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { isDefined } from '@common/utils';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Memo } from '@domain/common/memo/memo.entity';

const profileRelationOptions = {
  location: true,
  tagsets: true,
};

const profileSelectOptions = {
  references: false, // ?
  displayName: true,
  tagline: true,
  description: true,
  location: {
    city: true,
    country: true,
  },
  tagsets: {
    tags: true,
  },
};

const journeyFindOptions: FindManyOptions<Space> = {
  loadEagerRelations: false,
  relations: {
    about: {
      profile: profileRelationOptions,
    },
  },
  select: {
    id: true,
    level: true,
    visibility: true,
    about: {
      why: true,
      who: true,
      profile: profileSelectOptions,
    },
  },
};

const EMPTY_VALUE = 'N/A';

type ErroredDocument = {
  status: number | undefined;
  error: ErrorCause | undefined;
  operation: unknown;
  document: unknown;
};

type IngestBatchResultType = {
  success: boolean;
  message?: string;
  total: number;
  erroredDocuments?: ErroredDocument[];
};

type IngestBulkReturnType = {
  total: number;
  batches: IngestBatchResultType[];
};

type IngestReturnType = Record<string, IngestBulkReturnType>;

const getIndexAliases = (indexPattern: string) => [
  `${indexPattern}spaces`,
  `${indexPattern}subspaces`,
  `${indexPattern}organizations`,
  `${indexPattern}users`,
  `${indexPattern}posts`,
  `${indexPattern}callouts`,
  `${indexPattern}whiteboards`,
  `${indexPattern}memos`,
];

@Injectable()
export class SearchIngestService {
  private readonly indexPattern: string;
  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private elasticClient: ElasticClient | undefined,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    private taskService: TaskService
  ) {
    this.indexPattern = getIndexPattern(this.configService);

    if (!elasticClient) {
      this.logger.verbose?.(
        'Elasticsearch client not initialized',
        LogContext.SEARCH_INGEST
      );
      return;
    }
  }

  /**
   * create new indices with new names
   * ingest into new indices
   * does the aliases exist?
   * - no - fresh new setup -> assign alias to new indices
   * - yes - we have old indices -> remove old aliases; assign alias to new indices
   * did we have aliases?
   *  - no -> do nothing
   *  - yes -> delete index
   */
  public async ingestFromScratch(task: Task) {
    this.logger.verbose?.('Starting search ingest from scratch');
    // generate suffix; will be used across the whole ingest operation
    const suffix = this.generateSuffix();
    try {
      // create new indices with suffix
      await this.ingestStepCreateIndices(task, suffix);
      // ingest data into the new indices
      await this.ingestStepIngestIntoIndices(task, suffix);
      // manage the aliases
      const previouslyActiveAliasData = await this.ingestStepAssignAliases(
        task,
        suffix
      );
      // delete old indices, if aliases existed
      if (previouslyActiveAliasData.length > 0) {
        // get the old index names from the old active aliases
        const oldIndexNames = previouslyActiveAliasData.map(
          ({ index }) => index
        );
        await this.ingestStepDeleteOldIndices(task, oldIndexNames);
      }
      // cleanup and complete
      await this.taskService.complete(task.id);
      this.logger.verbose?.(
        'Search ingest from scratch completed successfully',
        LogContext.SEARCH_INGEST
      );
    } catch (e: any) {
      await this.taskService.completeWithError(
        task.id,
        `Ingest from scratch failed: ${e?.message}`
      );
      this.logger.verbose?.(
        'Search ingest from scratch completed with errors',
        LogContext.SEARCH_INGEST
      );
      this.logger.error?.(e?.message, e?.stack, LogContext.SEARCH_INGEST);
    }
  }

  /**
   * @throws Error when index creation fails
   * @private
   */
  private async ingestStepCreateIndices(
    task: Task,
    indexSuffix: string
  ): Promise<void> {
    await this.taskService.updateTaskResults(task.id, 'Creating indices');
    const creationResult = await this.ensureIndicesExist(indexSuffix);

    if (!creationResult.acknowledged) {
      await this.taskService.updateTaskErrors(
        task.id,
        `Failed to create indices: ${creationResult.message}`
      );
      throw new Error(`Failed to create indices: ${creationResult.message}`);
    }

    await this.taskService.updateTaskResults(task.id, 'Indices created');
  }

  /**
   * @throws Error when ingest fails
   * @private
   */
  private async ingestStepIngestIntoIndices(
    task: Task,
    indexSuffix: string
  ): Promise<void> {
    try {
      await this.ingest(task, indexSuffix);
    } catch (e: any) {
      await this.taskService.completeWithError(
        task.id,
        `Ingest completed with errors: ${e?.message}`
      );
      throw new Error(`Ingest completed with errors: ${e?.message}`);
    }
  }

  /**
   *
   * @returns The active aliases (old) before the reassignment
   * @private
   */
  private async ingestStepAssignAliases(task: Task, indexSuffix: string) {
    const activeAliasData = await this.getActiveAliases();
    const aliasesExist = activeAliasData.length > 0;

    await this.taskService.updateTaskResults(
      task.id,
      aliasesExist ? 'Active aliases found' : 'No active aliases found'
    );
    await this.taskService.updateTaskResults(
      task.id,
      'Assigning aliases to new indices'
    );
    // map the aliases to the new indices
    const data = this.getAliases().map(alias => ({
      alias,
      index: `${alias}-${indexSuffix}`,
    }));
    // assign the aliases to the new indices and delete the old ones if the aliases already existed
    await this.assignAliasToIndex(data, aliasesExist);

    return activeAliasData;
  }

  /**
   * @throws Error when deletion fails
   * @private
   */
  private async ingestStepDeleteOldIndices(
    task: Task,
    oldIndexNames: string[]
  ): Promise<void> {
    await this.taskService.updateTaskResults(
      task.id,
      `Removing the old indices: ${oldIndexNames.toString()}`
    );
    this.logger.verbose?.(
      `Removing the old indices: ${oldIndexNames.toString()}`,
      LogContext.SEARCH_INGEST
    );

    const removalResult = await this.removeIndices(oldIndexNames);
    if (!removalResult.acknowledged) {
      await this.taskService.completeWithError(
        task.id,
        `Failed to delete old indices: ${removalResult.message}`
      );
      throw new Error(`Failed to delete old indices: ${removalResult.message}`);
    }
  }

  /**
   * Returns a suffix based on the current date and time in the format YYYYMMDDHHmmss
   * @private
   */
  private generateSuffix(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private async getActiveAliases() {
    if (!this.elasticClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    const aliases = getIndexAliases(this.indexPattern);

    try {
      const data = await this.elasticClient.indices.getAlias({
        name: aliases,
      });

      // index names with these aliases
      return Object.entries(data).flatMap(([index, aliases]) => ({
        index,
        alias: Object.keys(aliases.aliases)[0], // we expect just one alias per index
      }));
    } catch {
      return [];
    }
  }

  private getAliases() {
    return getIndexAliases(this.indexPattern);
  }

  private async assignAliasToIndex(
    data: { alias: string; index: string }[],
    removeOldAlias?: boolean
  ) {
    if (!this.elasticClient) {
      throw new Error('Elasticsearch client not initialized');
    }

    const actions: IndicesUpdateAliasesAction[] = [];

    for (const { alias, index } of data) {
      if (removeOldAlias) {
        this.logger.verbose?.(
          `Removing alias '${alias}'`,
          LogContext.SEARCH_INGEST
        );
        actions.push({ remove: { index: '*', alias } });
      }

      this.logger.verbose?.(
        `Assigning alias '${alias}' to point to index '${index}'`,
        LogContext.SEARCH_INGEST
      );
      actions.push({ add: { index, alias } });
    }

    // Execute all alias updates in a single atomic operation
    await this.elasticClient.indices.updateAliases({ actions });
  }

  private async ensureIndicesExist(suffix: string): Promise<{
    acknowledged: boolean;
    message?: string;
  }> {
    if (!this.elasticClient) {
      return {
        acknowledged: false,
        message: 'Elasticsearch client not initialized',
      };
    }

    const aliases = getIndexAliases(this.indexPattern);

    const results = await asyncMap(aliases, async alias => {
      try {
        const ack = await this.elasticClient!.indices.create({
          index: `${alias}-${suffix}`,
        });
        return { acknowledged: ack.acknowledged };
      } catch (error) {
        const err = error as ElasticResponseError;
        return {
          acknowledged: false,
          message: err.meta.body.error.reason,
        };
      }
    });

    return results.reduce(
      (acc, val) => {
        if (!val.acknowledged) {
          acc.acknowledged = false;
          acc.message = val.message;
        }
        return acc;
      },
      { acknowledged: true }
    );
  }

  private async removeIndices(indices: Array<string>): Promise<{
    acknowledged: boolean;
    message?: string;
  }> {
    if (!this.elasticClient) {
      return {
        acknowledged: false,
        message: 'Elasticsearch client not initialized',
      };
    }

    const results = await asyncMap(indices, async index => {
      try {
        const ack = await this.elasticClient!.indices.delete({
          index,
        });
        return { acknowledged: ack.acknowledged };
      } catch (error) {
        const err = error as ElasticResponseError;
        // the API returns a number
        if ((err.meta.statusCode as unknown as number) === 404) {
          // already deleted or it never existed
          return { acknowledged: true };
        }

        return {
          acknowledged: false,
          message: err.meta.body.error.reason,
        };
      }
    });

    return results.reduce(
      (acc, val) => {
        if (!val.acknowledged) {
          acc.acknowledged = false;
          acc.message = val.message;
        }
        return acc;
      },
      { acknowledged: true }
    );
  }

  private async ingest(task: Task, suffix: string): Promise<IngestReturnType> {
    if (!this.elasticClient) {
      return {
        'N/A': {
          total: 0,
          batches: [
            {
              success: false,
              message: 'Elasticsearch client not initialized',
              total: 0,
            },
          ],
        },
      };
    }

    const result: IngestReturnType = {};
    const params = [
      {
        index: `${this.indexPattern}spaces-${suffix}`,
        fetchFn: this.fetchSpacesLevel0.bind(this),
        countFn: this.fetchSpacesLevel0Count.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}subspaces-${suffix}`,
        fetchFn: this.fetchSpacesLevel1.bind(this),
        countFn: this.fetchSpacesLevel1Count.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}subspaces-${suffix}`,
        fetchFn: this.fetchSpacesLevel2.bind(this),
        countFn: this.fetchSpacesLevel2Count.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}organizations-${suffix}`,
        fetchFn: this.fetchOrganizations.bind(this),
        countFn: this.fetchOrganizationsCount.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}users-${suffix}`,
        fetchFn: this.fetchUsers.bind(this),
        countFn: this.fetchUsersCount.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}callouts-${suffix}`,
        fetchFn: this.fetchCallout.bind(this),
        countFn: this.fetchCalloutCount.bind(this),
        batchSize: 30,
      },
      {
        index: `${this.indexPattern}posts-${suffix}`,
        fetchFn: this.fetchPosts.bind(this),
        countFn: this.fetchPostsCount.bind(this),
        batchSize: 30,
      },
      {
        index: `${this.indexPattern}whiteboards-${suffix}`,
        fetchFn: this.fetchWhiteboard.bind(this),
        countFn: this.fetchWhiteboardCount.bind(this),
        batchSize: 30,
      },
      {
        index: `${this.indexPattern}memos-${suffix}`,
        fetchFn: this.fetchMemo.bind(this),
        countFn: this.fetchMemoCount.bind(this),
        batchSize: 30,
      },
    ];

    return asyncReduceSequential(
      params,
      async (acc, { index, fetchFn, countFn, batchSize }) => {
        const batches = await this.fetchAndIngest(
          index,
          fetchFn,
          countFn,
          batchSize,
          task
        );
        const total = batches.reduce((acc, val) => acc + (val.total ?? 0), 0);
        acc[index] = {
          total: total + (acc[index]?.total ?? 0),
          batches: [...batches, ...(acc[index]?.batches ?? [])],
        };

        return acc;
      },
      result
    );
  }

  private async fetchAndIngest(
    index: string,
    fetchFn: (start: number, limit: number) => Promise<unknown[]>,
    countFn: () => Promise<number>,
    batchSize: number,
    task: Task
  ): Promise<IngestBatchResultType[]> {
    const total = await countFn();

    if (total === 0) {
      return [
        {
          success: true,
          message: `[${index}] - 0 documents indexed`,
          total: 0,
        },
      ];
    }

    this.logger.verbose?.(
      `Found ${total} total results to ingest into ${index}`,
      LogContext.SEARCH_INGEST
    );
    this.taskService.updateTaskResults(
      task.id,
      `Found ${total} total results to ingest into ${index}`
    );

    let start = 0;
    const results: IngestBatchResultType[] = [];

    while (start <= total) {
      const fetched = await fetchFn(start, batchSize);
      const result = await this.ingestBulk(fetched, index, task);
      results.push(result);

      if (result.erroredDocuments?.length) {
        this.logger.error(result.message, undefined, LogContext.SEARCH_INGEST);
      } else {
        this.logger.verbose?.(result.message, LogContext.SEARCH_INGEST);
      }

      start += batchSize;
      // delay between batches
      await setTimeout(500);
    }

    return results;
  }

  private async ingestBulk(
    data: unknown[],
    index: string,
    task: Task
  ): Promise<IngestBatchResultType> {
    if (!this.elasticClient) {
      return {
        success: false,
        total: 0,
        message: 'Elasticsearch client not initialized',
      };
    }

    if (!data.length) {
      return {
        success: true,
        total: 0,
        message: `[${index}] - 0 documents indexed`,
      };
    }

    const operations = data.flatMap(doc => [{ index: { _index: index } }, doc]);

    const bulkResponse = await this.elasticClient.bulk({
      refresh: true,
      operations,
    });

    if (bulkResponse.errors) {
      const erroredDocuments: ErroredDocument[] = [];
      // The items array has the same order of the dataset we just indexed.
      // The presence of the `error` key indicates that the operation
      // that we did for the document has failed.
      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0] as keyof typeof action;
        if (action[operation]?.error) {
          erroredDocuments.push({
            // If the status is 429 it means that you can retry the document,
            // otherwise it's very likely a mapping error, and you should
            // fix the document before to try it again.
            status: action[operation]?.status,
            error: action[operation]?.error,
            operation: operations[i * 2],
            document: operations[i * 2 + 1],
          });
        }
      });
      const message = `[${index}] - ${
        erroredDocuments.length
      } documents errored. ${
        data.length - erroredDocuments.length
      } documents indexed.`;
      this.taskService.updateTaskErrors(task.id, message);
      return {
        success: false,
        total: 0,
        message,
        erroredDocuments: erroredDocuments,
      };
    } else {
      const message = `[${index}] - ${data.length} documents indexed`;
      this.taskService.updateTaskResults(task.id, message);
      return {
        success: true,
        total: data.length,
        message,
      };
    }
  }
  // TODO: validate the loaded data for missing relations - https://github.com/alkem-io/server/issues/3699
  private fetchSpacesLevel0Count() {
    return this.entityManager.count<Space>(Space, {
      where: {
        level: SpaceLevel.L0,
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }
  private fetchSpacesLevel0(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          level: SpaceLevel.L0,
          visibility: SpaceVisibility.ACTIVE,
        },
        relations: {
          ...journeyFindOptions.relations,
        },
        select: {
          ...journeyFindOptions.select,
          visibility: true,
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        return spaces.map(space => ({
          ...space,
          account: undefined,
          type: SearchResultType.SPACE,
          visibility: space?.visibility,
          spaceID: space.id, // spaceID is the same as the space's id
          profile: {
            ...space.about.profile,
            tags: processTagsets(space.about.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchSpacesLevel1Count() {
    return this.entityManager.count<Space>(Space, {
      where: {
        level: SpaceLevel.L1,
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }
  private fetchSpacesLevel1(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          level: SpaceLevel.L1,
          visibility: SpaceVisibility.ACTIVE,
        },
        relations: {
          ...journeyFindOptions.relations,
          parentSpace: true,
        },
        select: {
          ...journeyFindOptions.select,
          visibility: true,
          parentSpace: { id: true },
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        return spaces.map(space => ({
          ...space,
          account: undefined,
          parentSpace: undefined,
          type: SearchResultType.SUBSPACE,
          visibility: space?.visibility,
          spaceID: space.parentSpace?.id ?? EMPTY_VALUE,
          profile: {
            ...space.about.profile,
            tags: processTagsets(space.about.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchSpacesLevel2Count() {
    return this.entityManager.count<Space>(Space, {
      where: {
        level: SpaceLevel.L2,
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }
  private fetchSpacesLevel2(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          level: SpaceLevel.L2,
          visibility: SpaceVisibility.ACTIVE,
        },
        relations: {
          ...journeyFindOptions.relations,
          parentSpace: { parentSpace: true },
        },
        select: {
          ...journeyFindOptions.select,
          visibility: true,
          parentSpace: { id: true, parentSpace: { id: true } },
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        return spaces.map(space => ({
          ...space,
          account: undefined,
          parentSpace: undefined,
          type: SearchResultType.SUBSPACE,
          visibility: space?.visibility,
          spaceID: space.parentSpace?.parentSpace?.id ?? EMPTY_VALUE,
          profile: {
            ...space.about.profile,
            tags: processTagsets(space.about.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchOrganizationsCount() {
    return this.entityManager.count<Organization>(Organization);
  }
  private fetchOrganizations(start: number, limit: number) {
    return this.entityManager
      .find<Organization>(Organization, {
        loadEagerRelations: false,
        relations: {
          profile: profileRelationOptions,
        },
        select: {
          profile: profileSelectOptions,
        },
        skip: start,
        take: limit,
      })
      .then(organizations => {
        return organizations.map(organization => ({
          ...organization,
          type: SearchResultType.ORGANIZATION,
          profile: {
            ...organization.profile,
            tags: processTagsets(organization.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchUsersCount() {
    return this.entityManager.count<User>(User, {
      where: { serviceProfile: false },
    });
  }
  private fetchUsers(start: number, limit: number) {
    return this.entityManager
      .find(User, {
        loadEagerRelations: false,
        where: { serviceProfile: false },
        relations: {
          profile: profileRelationOptions,
        },
        select: {
          profile: profileSelectOptions,
        },
        skip: start,
        take: limit,
      })
      .then(users =>
        users.map(user => ({
          ...user,
          authId: user.authId ?? EMPTY_VALUE,
          accountUpn: undefined,
          communicationID: undefined,
          email: undefined,
          phone: undefined,
          serviceProfile: undefined,
          type: SearchResultType.USER,
          profile: {
            ...user.profile,
            tags: processTagsets(user.profile.tagsets),
            tagsets: undefined,
          },
        }))
      );
  }

  private fetchCalloutCount() {
    // todo: count through Callout directly
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }

  private fetchCallout(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          visibility: SpaceVisibility.ACTIVE,
        },
        relations: {
          parentSpace: {
            parentSpace: true,
          },
          collaboration: {
            calloutsSet: {
              callouts: {
                framing: {
                  profile: profileRelationOptions,
                },
              },
            },
          },
        },
        select: {
          id: true,
          visibility: true,
          parentSpace: { id: true, parentSpace: { id: true } },
          collaboration: {
            id: true,
            calloutsSet: {
              id: true,
              callouts: {
                id: true,
                createdBy: true,
                createdDate: true,
                nameID: true,
                framing: {
                  id: true,
                  profile: profileSelectOptions,
                },
              },
            },
          },
        },
        skip: start,
        take: limit,
      })
      .then(spaces =>
        spaces.flatMap(space =>
          space.collaboration?.calloutsSet?.callouts?.map(callout => ({
            ...callout,
            framing: undefined,
            type: SearchResultType.CALLOUT,
            license: {
              visibility: space?.visibility ?? EMPTY_VALUE,
            },
            spaceID:
              space.parentSpace?.parentSpace?.id ??
              space.parentSpace?.id ??
              space.id,
            collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
            profile: {
              ...callout.framing.profile,
              tags: processTagsets(callout.framing?.profile?.tagsets),
              tagsets: undefined,
            },
          }))
        )
      );
  }

  private fetchWhiteboardCount() {
    // todo: count through Whiteboard directly; consider both framing and contributions
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }

  private fetchWhiteboard(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          visibility: SpaceVisibility.ACTIVE,
        },
        relations: {
          collaboration: {
            calloutsSet: {
              callouts: {
                framing: {
                  whiteboard: {
                    profile: profileRelationOptions,
                  },
                },
                contributions: {
                  whiteboard: {
                    profile: profileRelationOptions,
                  },
                },
              },
            },
          },
          parentSpace: {
            parentSpace: true,
          },
        },
        select: {
          id: true,
          visibility: true,
          collaboration: {
            id: true,
            calloutsSet: {
              id: true,
              callouts: {
                id: true,
                createdBy: true,
                createdDate: true,
                nameID: true,
                framing: {
                  id: true,
                  whiteboard: {
                    id: true,
                    content: true,
                    profile: profileSelectOptions,
                  },
                },
                contributions: {
                  id: true,
                  whiteboard: {
                    id: true,
                    content: true,
                    profile: profileSelectOptions,
                  },
                },
              },
            },
          },
          parentSpace: {
            id: true,
            parentSpace: {
              id: true,
            },
          },
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        return spaces.flatMap(space => {
          const callouts = space.collaboration?.calloutsSet?.callouts;
          return callouts
            ?.flatMap(callout => {
              // a callout can have whiteboard in the framing
              // AND whiteboards in the contributions
              const wbs = [];
              if (callout.framing.whiteboard) {
                const content = extractTextFromWhiteboardContent(
                  callout.framing.whiteboard.content
                );
                // only whiteboards with content are ingested
                if (!content) {
                  return;
                }

                wbs.push({
                  ...callout.framing.whiteboard,
                  content,
                  type: SearchResultType.WHITEBOARD,
                  license: {
                    visibility: space?.visibility ?? EMPTY_VALUE,
                  },
                  spaceID:
                    space?.parentSpace?.parentSpace?.id ??
                    space?.parentSpace?.id ??
                    space.id,
                  calloutID: callout.id,
                  collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                  profile: {
                    ...callout.framing.whiteboard.profile,
                    tags: processTagsets(
                      callout.framing.whiteboard?.profile?.tagsets
                    ),
                    tagsets: undefined,
                  },
                });
              }

              callout?.contributions?.forEach(contribution => {
                if (!contribution?.whiteboard) {
                  return;
                }

                const content = extractTextFromWhiteboardContent(
                  contribution.whiteboard.content
                );
                // only whiteboards with content are ingested
                if (!content) {
                  return;
                }

                wbs.push({
                  ...contribution.whiteboard,
                  content,
                  type: SearchResultType.WHITEBOARD,
                  license: {
                    visibility: space?.visibility ?? EMPTY_VALUE,
                  },
                  spaceID:
                    space?.parentSpace?.parentSpace?.id ??
                    space?.parentSpace?.id ??
                    space.id,
                  calloutID: callout.id,
                  collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                  profile: {
                    ...contribution.whiteboard.profile,
                    tags: processTagsets(
                      contribution.whiteboard?.profile?.tagsets
                    ),
                    tagsets: undefined,
                  },
                });
              });

              return wbs;
            })
            .filter(Boolean);
        });
      });
  }

  private fetchMemoCount() {
    // todo: count through Memo directly; consider both framing and contributions
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }
  private async fetchMemo(start: number, limit: number) {
    const spaces = await this.entityManager.find<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: SpaceVisibility.ACTIVE,
      },
      relations: {
        collaboration: {
          calloutsSet: {
            callouts: {
              framing: {
                memo: {
                  profile: profileRelationOptions,
                },
              },
              contributions: {
                memo: {
                  profile: profileRelationOptions,
                },
              },
            },
          },
        },
        parentSpace: {
          parentSpace: true,
        },
      },
      select: {
        id: true,
        visibility: true,
        collaboration: {
          id: true,
          calloutsSet: {
            id: true,
            callouts: {
              id: true,
              createdBy: true,
              createdDate: true,
              nameID: true,
              framing: {
                id: true,
                memo: {
                  id: true,
                  content: true,
                  profile: profileSelectOptions,
                },
              },
              contributions: {
                id: true,
                memo: {
                  id: true,
                  content: true,
                  profile: profileSelectOptions,
                },
              },
            },
          },
        },
        parentSpace: {
          id: true,
          parentSpace: {
            id: true,
          },
        },
      },
      skip: start,
      take: limit,
    });

    const memoForIngestion = (memo: Memo, callout: Callout, space: Space) => {
      const markdown = extractMarkdownFromMemoContent(memo.content);
      // only memos with content are ingested
      if (!markdown) {
        return;
      }

      return {
        ...memo,
        content: undefined,
        markdown,
        type: SearchResultType.MEMO,
        license: {
          visibility: space?.visibility ?? EMPTY_VALUE,
        },
        spaceID:
          space?.parentSpace?.parentSpace?.id ??
          space?.parentSpace?.id ??
          space.id,
        calloutID: callout.id,
        collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
        profile: {
          ...memo.profile,
          tags: processTagsets(memo?.profile?.tagsets),
          tagsets: undefined,
        },
      };
    };

    return spaces.flatMap(space => {
      const callouts = space.collaboration?.calloutsSet?.callouts ?? [];
      return callouts
        .flatMap(callout => {
          // a callout can have memo in the framing
          // AND memos in the contributions
          const memos: (Record<string, unknown> | undefined)[] = [];
          if (callout.framing.memo) {
            memos.push(memoForIngestion(callout.framing.memo, callout, space));
          }

          callout?.contributions?.forEach(({ memo }) => {
            if (!memo) {
              return;
            }

            memos.push(memoForIngestion(memo, callout, space));
          });

          return memos;
        })
        .filter(isDefined);
    });
  }

  private fetchPostsCount() {
    // todo: count through Post directly
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: SpaceVisibility.ACTIVE,
      },
    });
  }
  private fetchPosts(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          visibility: SpaceVisibility.ACTIVE,
        },
        relations: {
          collaboration: {
            calloutsSet: {
              callouts: {
                contributions: {
                  post: {
                    profile: profileRelationOptions,
                  },
                },
              },
            },
          },
          parentSpace: {
            parentSpace: true,
          },
        },
        select: {
          id: true,
          visibility: true,
          collaboration: {
            id: true,
            calloutsSet: {
              id: true,
              callouts: {
                id: true,
                contributions: {
                  id: true,
                  post: {
                    id: true,
                    createdBy: true,
                    createdDate: true,
                    nameID: true,
                    profile: profileSelectOptions,
                  },
                },
              },
            },
          },
          parentSpace: {
            id: true,
            parentSpace: {
              id: true,
            },
          },
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        const posts: any[] = [];
        spaces.forEach(space => {
          const callouts = space?.collaboration?.calloutsSet?.callouts;
          callouts?.forEach(callout => {
            const contributions = callout?.contributions;
            contributions?.forEach(contribution => {
              if (!contribution.post) {
                return;
              }
              posts.push({
                ...contribution.post,
                type: SearchResultType.POST,
                license: {
                  visibility: space?.visibility ?? EMPTY_VALUE,
                },
                spaceID:
                  space.parentSpace?.parentSpace?.id ??
                  space.parentSpace?.id ??
                  space.id,
                calloutID: callout.id,
                collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                profile: {
                  ...contribution.post.profile,
                  tags: processTagsets(contribution.post?.profile?.tagsets),
                  tagsets: undefined,
                },
              });
            });
          });
        });

        return posts;
      });
  }
}

const processTagsets = (tagsets: Tagset[] | undefined) => {
  return tagsets?.flatMap(tagset => tagset.tags).join(' ');
};

const extractTextFromWhiteboardContent = (content: string): string => {
  if (!content) {
    return '';
  }

  try {
    const { elements }: ExcalidrawContent = JSON.parse(content);
    return elements
      .filter(isExcalidrawTextElement)
      .map(x => x.originalText)
      .join(' ');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    return '';
  }
};

const extractMarkdownFromMemoContent = (
  content?: Buffer
): string | undefined => {
  if (!content) {
    return undefined;
  }

  return yjsStateToMarkdown(content);
};
