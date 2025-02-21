import { setTimeout } from 'timers/promises';
import { EntityManager, Not, FindManyOptions } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
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
import { SearchEntityTypes } from '../search.entity.types';
import { ExcalidrawContent, isExcalidrawTextElement } from '@common/interfaces';
import { TaskService } from '@services/task';
import { Task } from '@services/task/task.interface';
import { AlkemioConfig } from '@src/types';

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

const getIndices = (indexPattern: string) => [
  `${indexPattern}spaces`,
  `${indexPattern}subspaces`,
  `${indexPattern}organizations`,
  `${indexPattern}users`,
  `${indexPattern}posts`,
  `${indexPattern}callouts`,
  `${indexPattern}whiteboards`,
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
      this.logger.error(
        'Elasticsearch client not initialized',
        undefined,
        LogContext.SEARCH_INGEST
      );
      return;
    }
  }

  public async ensureIndicesExist(): Promise<{
    acknowledged: boolean;
    message?: string;
  }> {
    if (!this.elasticClient) {
      return {
        acknowledged: false,
        message: 'Elasticsearch client not initialized',
      };
    }

    const indices = getIndices(this.indexPattern);

    const results = await asyncMap(indices, async index => {
      try {
        const ack = await this.elasticClient!.indices.create({ index });
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

  public async removeIndices(): Promise<{
    acknowledged: boolean;
    message?: string;
  }> {
    if (!this.elasticClient) {
      return {
        acknowledged: false,
        message: 'Elasticsearch client not initialized',
      };
    }
    const indices = getIndices(this.indexPattern);

    const results = await asyncMap(indices, async index => {
      // if does not exist exit early, no need to delete

      try {
        if (!(await this.elasticClient!.indices.exists({ index }))) {
          return { acknowledged: true };
        }
      } catch (e: any) {
        return { acknowledged: false, message: e?.message };
      }

      try {
        const ack = await this.elasticClient!.indices.delete({ index });
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

  public async ingest(task: Task): Promise<IngestReturnType> {
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
        index: `${this.indexPattern}spaces`,
        fetchFn: this.fetchSpacesLevel0.bind(this),
        countFn: this.fetchSpacesLevel0Count.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}subspaces`,
        fetchFn: this.fetchSpacesLevel1.bind(this),
        countFn: this.fetchSpacesLevel1Count.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}subspaces`,
        fetchFn: this.fetchSpacesLevel2.bind(this),
        countFn: this.fetchSpacesLevel2Count.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}organizations`,
        fetchFn: this.fetchOrganizations.bind(this),
        countFn: this.fetchOrganizationsCount.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}users`,
        fetchFn: this.fetchUsers.bind(this),
        countFn: this.fetchUsersCount.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}callouts`,
        fetchFn: this.fetchCallout.bind(this),
        countFn: this.fetchCalloutCount.bind(this),
        batchSize: 20,
      },
      {
        index: `${this.indexPattern}posts`,
        fetchFn: this.fetchPosts.bind(this),
        countFn: this.fetchPostsCount.bind(this),
        batchSize: 20,
      },
      {
        index: `${this.indexPattern}whiteboards`,
        fetchFn: this.fetchWhiteboard.bind(this),
        countFn: this.fetchWhiteboardCount.bind(this),
        batchSize: 20,
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
    let start = 0;
    const results: IngestBatchResultType[] = [];

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
      await setTimeout(1000, null);
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
        visibility: Not(SpaceVisibility.ARCHIVED),
        level: SpaceLevel.L0,
      },
    });
  }
  private fetchSpacesLevel0(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          visibility: Not(SpaceVisibility.ARCHIVED),
          level: SpaceLevel.L0,
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
          type: SearchEntityTypes.SPACE,
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
        visibility: Not(SpaceVisibility.ARCHIVED),
        level: SpaceLevel.L1,
      },
    });
  }
  private fetchSpacesLevel1(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          visibility: Not(SpaceVisibility.ARCHIVED),
          level: SpaceLevel.L1,
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
          type: SearchEntityTypes.SUBSPACE,
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
        visibility: Not(SpaceVisibility.ARCHIVED),
        level: SpaceLevel.L2,
      },
    });
  }
  private fetchSpacesLevel2(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          visibility: Not(SpaceVisibility.ARCHIVED),
          level: SpaceLevel.L2,
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
          type: SearchEntityTypes.SUBSPACE,
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
          type: SearchEntityTypes.ORGANIZATION,
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
          accountUpn: undefined,
          communicationID: undefined,
          email: undefined,
          phone: undefined,
          serviceProfile: undefined,
          type: SearchEntityTypes.USER,
          profile: {
            ...user.profile,
            tags: processTagsets(user.profile.tagsets),
            tagsets: undefined,
          },
        }))
      );
  }

  private fetchCalloutCount() {
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: Not(SpaceVisibility.ARCHIVED),
      },
    });
  }
  private fetchCallout(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          visibility: Not(SpaceVisibility.ARCHIVED),
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
            type: SearchEntityTypes.CALLOUT,
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
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: Not(SpaceVisibility.ARCHIVED),
      },
    });
  }
  private fetchWhiteboard(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          visibility: Not(SpaceVisibility.ARCHIVED),
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
                  type: SearchEntityTypes.WHITEBOARD,
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
                  content: extractTextFromWhiteboardContent(
                    contribution.whiteboard.content
                  ),
                  type: SearchEntityTypes.WHITEBOARD,
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

  private fetchPostsCount() {
    return this.entityManager.count<Space>(Space, {
      loadEagerRelations: false,
      where: {
        visibility: Not(SpaceVisibility.ARCHIVED),
      },
    });
  }
  private fetchPosts(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          visibility: Not(SpaceVisibility.ARCHIVED),
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
                type: SearchEntityTypes.POST,
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
  } catch (e) {
    return '';
  }
};
