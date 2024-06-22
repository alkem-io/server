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
import { User } from '@domain/community/user';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Tagset } from '@domain/common/tagset';
import { LogContext } from '@common/enums';
import { asyncReduceSequential } from '@common/utils/async.reduce.sequential';
import { asyncMap } from '@common/utils/async.map';
import { ElasticResponseError } from '@services/external/elasticsearch/types';
import { SpaceLevel } from '@common/enums/space.level';
import { getIndexPattern } from './get.index.pattern';
import { SearchEntityTypes } from '../../search.entity.types';
import { ExcalidrawContent, isExcalidrawTextElement } from '@common/interfaces';
import { TaskService } from '@services/task';
import { Task } from '@services/task/task.interface';

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
    context: true,
    profile: profileRelationOptions,
  },
  select: {
    id: true,
    level: true,
    context: {
      vision: true,
      impact: true,
      who: true,
    },
    profile: profileSelectOptions,
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
    private configService: ConfigService,
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
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}subspaces`,
        fetchFn: this.fetchSpacesLevel1.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}subspaces`,
        fetchFn: this.fetchSpacesLevel2.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}organizations`,
        fetchFn: this.fetchOrganization.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}users`,
        fetchFn: this.fetchUsers.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}posts`,
        fetchFn: this.fetchPosts.bind(this),
        batchSize: 20,
      },
      {
        index: `${this.indexPattern}callouts`,
        fetchFn: this.fetchCallout.bind(this),
        batchSize: 20,
      },
      {
        index: `${this.indexPattern}whiteboards`,
        fetchFn: this.fetchWhiteboard.bind(this),
        batchSize: 10,
      },
    ];

    return asyncReduceSequential(
      params,
      async (acc, { index, fetchFn, batchSize }) => {
        const batches = await this.fetchAndIngest(
          index,
          fetchFn,
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
    batchSize: number,
    task: Task
  ): Promise<IngestBatchResultType[]> {
    let start = 0;
    const results: IngestBatchResultType[] = [];

    while (true) {
      const fetched = await fetchFn(start, batchSize);
      // if there are no results fetched, we have reached the end
      if (!fetched.length) {
        break;
      }

      const result = await this.ingestBulk(fetched, index, task);
      results.push(result);
      // some statement are not directly querying a table, but instead parent entities
      // so the total count is not predictable; in that case an extra query has to be made
      // to ensure there is no more data
      if (!fetched.length) {
        break;
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
        message: 'No data indexed',
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
      this.logger.error(message, undefined, LogContext.SEARCH_INGEST);
      this.taskService.updateTaskErrors(task.id, message);
      return {
        success: false,
        total: 0,
        message,
        erroredDocuments: erroredDocuments,
      };
    } else {
      const message = `[${index}] - ${data.length} documents indexed`;
      this.logger.verbose?.(message, LogContext.SEARCH_INGEST);
      this.taskService.updateTaskResults(task.id, message);
      return {
        success: true,
        total: data.length,
        message,
      };
    }
  }
  // TODO: validate the loaded data for missing relations - https://github.com/alkem-io/server/issues/3699
  private fetchSpacesLevel0(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          account: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
          level: SpaceLevel.SPACE,
        },
        relations: {
          ...journeyFindOptions.relations,
          account: { license: true },
        },
        select: {
          ...journeyFindOptions.select,
          account: { id: true, license: { visibility: true } },
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        return spaces.map(space => ({
          ...space,
          account: undefined,
          type: SearchEntityTypes.SPACE,
          license: { visibility: space?.account?.license?.visibility },
          spaceID: space.id, // spaceID is the same as the space's id
          profile: {
            ...space.profile,
            tags: processTagsets(space.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchSpacesLevel1(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          account: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
          level: SpaceLevel.CHALLENGE,
        },
        relations: {
          ...journeyFindOptions.relations,
          account: { license: true },
          parentSpace: true,
        },
        select: {
          ...journeyFindOptions.select,
          account: { id: true, license: { visibility: true } },
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
          type: SearchEntityTypes.SPACE,
          license: { visibility: space?.account?.license?.visibility },
          spaceID: space.parentSpace?.id ?? EMPTY_VALUE,
          profile: {
            ...space.profile,
            tags: processTagsets(space.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchSpacesLevel2(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          account: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
          level: SpaceLevel.OPPORTUNITY,
        },
        relations: {
          ...journeyFindOptions.relations,
          account: { license: true },
          parentSpace: { parentSpace: true },
        },
        select: {
          ...journeyFindOptions.select,
          account: { id: true, license: { visibility: true } },
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
          type: SearchEntityTypes.SPACE,
          license: { visibility: space?.account?.license?.visibility },
          spaceID: space.parentSpace?.parentSpace?.id ?? EMPTY_VALUE,
          profile: {
            ...space.profile,
            tags: processTagsets(space.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchOrganization(start: number, limit: number) {
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
          gender: undefined,
          type: SearchEntityTypes.USER,
          profile: {
            ...user.profile,
            tags: processTagsets(user.profile.tagsets),
            tagsets: undefined,
          },
        }))
      );
  }

  private fetchCallout(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          account: {
            license: { visibility: Not(SpaceVisibility.ARCHIVED) },
          },
        },
        relations: {
          account: { license: true },
          collaboration: {
            callouts: {
              framing: {
                profile: profileRelationOptions,
              },
            },
          },
        },
        select: {
          id: true,
          account: { id: true, license: { visibility: true } },
          collaboration: {
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
        skip: start,
        take: limit,
      })
      .then(spaces =>
        spaces.flatMap(space =>
          space.collaboration?.callouts?.map(callout => ({
            ...callout,
            framing: undefined,
            type: SearchEntityTypes.CALLOUT,
            license: {
              visibility: space?.account?.license?.visibility ?? EMPTY_VALUE,
            },
            spaceID: space.id,
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

  private fetchWhiteboard(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          account: {
            license: { visibility: Not(SpaceVisibility.ARCHIVED) },
          },
        },
        relations: {
          account: { license: true },
          collaboration: {
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
        select: {
          id: true,
          account: { id: true, license: { visibility: true } },
          collaboration: {
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
        skip: start,
        take: limit,
      })
      .then(spaces => {
        return spaces.flatMap(space => {
          return space.collaboration?.callouts
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
                    visibility:
                      space?.account?.license?.visibility ?? EMPTY_VALUE,
                  },
                  spaceID: space.id,
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
                    visibility:
                      space?.account?.license?.visibility ?? EMPTY_VALUE,
                  },
                  spaceID: space.id,
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

  private fetchPosts(start: number, limit: number) {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: {
          account: {
            license: { visibility: Not(SpaceVisibility.ARCHIVED) },
          },
        },
        relations: {
          account: { license: true },
          collaboration: {
            callouts: {
              contributions: {
                post: {
                  profile: profileRelationOptions,
                },
              },
            },
          },
          subspaces: {
            collaboration: {
              callouts: {
                contributions: {
                  post: {
                    profile: profileRelationOptions,
                  },
                },
              },
            },
            subspaces: {
              collaboration: {
                callouts: {
                  contributions: {
                    post: {
                      profile: profileRelationOptions,
                    },
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          account: { id: true, license: { visibility: true } },
          collaboration: {
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
          subspaces: {
            id: true,
            collaboration: {
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
            subspaces: {
              id: true,
              collaboration: {
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
          },
        },
        skip: start,
        take: limit,
      })
      .then(spaces => {
        const posts: any[] = [];
        spaces.forEach(space =>
          space?.collaboration?.callouts?.forEach(callout =>
            callout?.contributions?.forEach(contribution => {
              if (!contribution.post) {
                return;
              }
              posts.push({
                ...contribution.post,
                type: SearchEntityTypes.POST,
                license: {
                  visibility:
                    space?.account?.license?.visibility ?? EMPTY_VALUE,
                },
                spaceID: space.id,
                calloutID: callout.id,
                collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                profile: {
                  ...contribution.post.profile,
                  tags: processTagsets(contribution.post?.profile?.tagsets),
                  tagsets: undefined,
                },
              });
            })
          )
        );

        return posts;
      });
  }
}

const processTagsets = (tagsets: Tagset[] | undefined) => {
  return tagsets?.flatMap(tagset => tagset.tags).join(' ');
};
// todo: maybe look for text in the shapes also
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
