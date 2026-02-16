import { setTimeout } from 'node:timers/promises';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { LogContext } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ExcalidrawContent, isExcalidrawTextElement } from '@common/interfaces';
import { isDefined } from '@common/utils';
import { asyncMap } from '@common/utils/async.map';
import { asyncReduceSequential } from '@common/utils/async.reduce.sequential';
import { yjsStateToMarkdown } from '@domain/common/memo/conversion';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import {
  ErrorCause,
  IndicesUpdateAliasesAction,
} from '@elastic/elasticsearch/lib/api/types';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticResponseError } from '@services/external/elasticsearch/types';
import { TaskService } from '@services/task';
import { Task } from '@services/task/task.interface';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, and, sql, count } from 'drizzle-orm';
import { spaces } from '@domain/space/space/space.schema';
import { organizations } from '@domain/community/organization/organization.schema';
import { users } from '@domain/community/user/user.schema';
import { SearchResultType } from '../search.result.type';
import { getIndexPattern } from './get.index.pattern';

/** Drizzle `with` shape for loading profile with location + tagsets */
const profileWith = {
  location: true,
  tagsets: true,
} as const;

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
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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
  private async fetchSpacesLevel0Count() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(
        and(
          eq(spaces.level, SpaceLevel.L0),
          eq(spaces.visibility, SpaceVisibility.ACTIVE)
        )
      );
    return result[0]?.count ?? 0;
  }
  private async fetchSpacesLevel0(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: and(
        eq(spaces.level, SpaceLevel.L0),
        eq(spaces.visibility, SpaceVisibility.ACTIVE)
      ),
      with: {
        about: { with: { profile: { with: profileWith } } },
      },
      offset: start,
      limit,
    });

    return spaceResults.map(space => ({
      ...space,
      account: undefined,
      type: SearchResultType.SPACE,
      visibility: space.visibility,
      spaceID: space.id,
      profile: {
        ...(space as any).about?.profile,
        tags: processTagsets((space as any).about?.profile?.tagsets),
        tagsets: undefined,
      },
    }));
  }

  private async fetchSpacesLevel1Count() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(and(eq(spaces.level, SpaceLevel.L1), eq(spaces.visibility, SpaceVisibility.ACTIVE)));
    return result[0]?.count ?? 0;
  }
  private async fetchSpacesLevel1(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: and(
        eq(spaces.level, SpaceLevel.L1),
        eq(spaces.visibility, SpaceVisibility.ACTIVE)
      ),
      with: {
        about: { with: { profile: { with: profileWith } } },
        parentSpace: true,
      },
      offset: start,
      limit,
    });

    return spaceResults.map(space => ({
      ...space,
      account: undefined,
      parentSpace: undefined,
      type: SearchResultType.SUBSPACE,
      visibility: space.visibility,
      spaceID: (space as any).parentSpace?.id ?? EMPTY_VALUE,
      profile: {
        ...(space as any).about?.profile,
        tags: processTagsets((space as any).about?.profile?.tagsets),
        tagsets: undefined,
      },
    }));
  }

  private async fetchSpacesLevel2Count() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(and(eq(spaces.level, SpaceLevel.L2), eq(spaces.visibility, SpaceVisibility.ACTIVE)));
    return result[0]?.count ?? 0;
  }
  private async fetchSpacesLevel2(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: and(
        eq(spaces.level, SpaceLevel.L2),
        eq(spaces.visibility, SpaceVisibility.ACTIVE)
      ),
      with: {
        about: { with: { profile: { with: profileWith } } },
        parentSpace: { with: { parentSpace: true } },
      },
      offset: start,
      limit,
    });

    return spaceResults.map(space => ({
      ...space,
      account: undefined,
      parentSpace: undefined,
      type: SearchResultType.SUBSPACE,
      visibility: space.visibility,
      spaceID: (space as any).parentSpace?.parentSpace?.id ?? EMPTY_VALUE,
      profile: {
        ...(space as any).about?.profile,
        tags: processTagsets((space as any).about?.profile?.tagsets),
        tagsets: undefined,
      },
    }));
  }

  private async fetchOrganizationsCount() {
    const result = await this.db.select({ count: count() }).from(organizations);
    return result[0]?.count ?? 0;
  }
  private async fetchOrganizations(start: number, limit: number) {
    const orgResults = await this.db.query.organizations.findMany({
      with: { profile: { with: profileWith } },
      offset: start,
      limit,
    });

    return orgResults.map(org => ({
      ...org,
      type: SearchResultType.ORGANIZATION,
      profile: {
        ...(org as any).profile,
        tags: processTagsets((org as any).profile?.tagsets),
        tagsets: undefined,
      },
    }));
  }

  private async fetchUsersCount() {
    const result = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.serviceProfile, false));
    return result[0]?.count ?? 0;
  }
  private async fetchUsers(start: number, limit: number) {
    const userResults = await this.db.query.users.findMany({
      where: eq(users.serviceProfile, false),
      with: { profile: { with: profileWith } },
      offset: start,
      limit,
    });

    return userResults.map(user => ({
      ...user,
      email: undefined,
      phone: undefined,
      serviceProfile: undefined,
      type: SearchResultType.USER,
      profile: {
        ...(user as any).profile,
        tags: processTagsets((user as any).profile?.tagsets),
        tagsets: undefined,
      },
    }));
  }

  private async fetchCalloutCount() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(eq(spaces.visibility, SpaceVisibility.ACTIVE));
    return result[0]?.count ?? 0;
  }

  private async fetchCallout(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: eq(spaces.visibility, SpaceVisibility.ACTIVE),
      with: {
        parentSpace: { with: { parentSpace: true } },
        collaboration: {
          with: {
            calloutsSet: {
              with: {
                callouts: {
                  with: {
                    framing: { with: { profile: { with: profileWith } } },
                  },
                },
              },
            },
          },
        },
      },
      offset: start,
      limit,
    } as any);

    return spaceResults.flatMap((space: any) =>
      space.collaboration?.calloutsSet?.callouts?.map((callout: any) => ({
        ...callout,
        framing: undefined,
        type: SearchResultType.CALLOUT,
        license: { visibility: space?.visibility ?? EMPTY_VALUE },
        spaceID:
          space.parentSpace?.parentSpace?.id ??
          space.parentSpace?.id ??
          space.id,
        collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
        profile: {
          ...callout.framing?.profile,
          tags: processTagsets(callout.framing?.profile?.tagsets),
          tagsets: undefined,
        },
      }))
    );
  }

  private async fetchWhiteboardCount() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(eq(spaces.visibility, SpaceVisibility.ACTIVE));
    return result[0]?.count ?? 0;
  }

  private async fetchWhiteboard(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: eq(spaces.visibility, SpaceVisibility.ACTIVE),
      with: {
        collaboration: {
          with: {
            calloutsSet: {
              with: {
                callouts: {
                  with: {
                    framing: { with: { whiteboard: { with: { profile: { with: profileWith } } } } },
                    contributions: { with: { whiteboard: { with: { profile: { with: profileWith } } } } },
                  },
                },
              },
            },
          },
        },
        parentSpace: { with: { parentSpace: true } },
      },
      offset: start,
      limit,
    } as any);

    return spaceResults.flatMap((space: any) => {
      const calloutList = space.collaboration?.calloutsSet?.callouts;
      return (calloutList ?? [])
        .flatMap((callout: any) => {
          const wbs: any[] = [];
          if (callout.framing?.whiteboard) {
            const content = extractTextFromWhiteboardContent(callout.framing.whiteboard.content);
            if (content) {
              wbs.push({
                ...callout.framing.whiteboard,
                content,
                type: SearchResultType.WHITEBOARD,
                license: { visibility: space?.visibility ?? EMPTY_VALUE },
                spaceID: space?.parentSpace?.parentSpace?.id ?? space?.parentSpace?.id ?? space.id,
                calloutID: callout.id,
                collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                profile: {
                  ...callout.framing.whiteboard.profile,
                  tags: processTagsets(callout.framing.whiteboard?.profile?.tagsets),
                  tagsets: undefined,
                },
              });
            }
          }

          callout?.contributions?.forEach((contribution: any) => {
            if (!contribution?.whiteboard) return;
            const content = extractTextFromWhiteboardContent(contribution.whiteboard.content);
            if (!content) return;
            wbs.push({
              ...contribution.whiteboard,
              content,
              type: SearchResultType.WHITEBOARD,
              license: { visibility: space?.visibility ?? EMPTY_VALUE },
              spaceID: space?.parentSpace?.parentSpace?.id ?? space?.parentSpace?.id ?? space.id,
              calloutID: callout.id,
              collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
              profile: {
                ...contribution.whiteboard.profile,
                tags: processTagsets(contribution.whiteboard?.profile?.tagsets),
                tagsets: undefined,
              },
            });
          });

          return wbs;
        })
        .filter(Boolean);
    });
  }

  private async fetchMemoCount() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(eq(spaces.visibility, SpaceVisibility.ACTIVE));
    return result[0]?.count ?? 0;
  }
  private async fetchMemo(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: eq(spaces.visibility, SpaceVisibility.ACTIVE),
      with: {
        collaboration: {
          with: {
            calloutsSet: {
              with: {
                callouts: {
                  with: {
                    framing: { with: { memo: { with: { profile: { with: profileWith } } } } },
                    contributions: { with: { memo: { with: { profile: { with: profileWith } } } } },
                  },
                },
              },
            },
          },
        },
        parentSpace: { with: { parentSpace: true } },
      },
      offset: start,
      limit,
    } as any);

    const memoForIngestion = (memo: any, callout: any, space: any) => {
      const markdown = extractMarkdownFromMemoContent(memo.content);
      if (!markdown) return;
      return {
        ...memo,
        content: undefined,
        markdown,
        type: SearchResultType.MEMO,
        license: { visibility: space?.visibility ?? EMPTY_VALUE },
        spaceID: space?.parentSpace?.parentSpace?.id ?? space?.parentSpace?.id ?? space.id,
        calloutID: callout.id,
        collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
        profile: {
          ...memo.profile,
          tags: processTagsets(memo?.profile?.tagsets),
          tagsets: undefined,
        },
      };
    };

    return spaceResults.flatMap((space: any) => {
      const calloutList = space.collaboration?.calloutsSet?.callouts ?? [];
      return calloutList
        .flatMap((callout: any) => {
          const memoItems: (Record<string, unknown> | undefined)[] = [];
          if (callout.framing?.memo) {
            memoItems.push(memoForIngestion(callout.framing.memo, callout, space));
          }
          callout?.contributions?.forEach(({ memo }: any) => {
            if (!memo) return;
            memoItems.push(memoForIngestion(memo, callout, space));
          });
          return memoItems;
        })
        .filter(isDefined);
    });
  }

  private async fetchPostsCount() {
    const result = await this.db
      .select({ count: count() })
      .from(spaces)
      .where(eq(spaces.visibility, SpaceVisibility.ACTIVE));
    return result[0]?.count ?? 0;
  }
  private async fetchPosts(start: number, limit: number) {
    const spaceResults = await this.db.query.spaces.findMany({
      where: eq(spaces.visibility, SpaceVisibility.ACTIVE),
      with: {
        collaboration: {
          with: {
            calloutsSet: {
              with: {
                callouts: {
                  with: {
                    contributions: { with: { post: { with: { profile: { with: profileWith } } } } },
                  },
                },
              },
            },
          },
        },
        parentSpace: { with: { parentSpace: true } },
      },
      offset: start,
      limit,
    } as any);

    const postItems: any[] = [];
    spaceResults.forEach((space: any) => {
      const calloutList = space?.collaboration?.calloutsSet?.callouts;
      calloutList?.forEach((callout: any) => {
        callout?.contributions?.forEach((contribution: any) => {
          if (!contribution.post) return;
          postItems.push({
            ...contribution.post,
            type: SearchResultType.POST,
            license: { visibility: space?.visibility ?? EMPTY_VALUE },
            spaceID: space.parentSpace?.parentSpace?.id ?? space.parentSpace?.id ?? space.id,
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

    return postItems;
  }
}

const processTagsets = (tagsets: { tags: string[] }[] | undefined) => {
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
  } catch (_error: any) {
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
