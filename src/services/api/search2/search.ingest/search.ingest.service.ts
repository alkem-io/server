import { setTimeout } from 'timers/promises';
import { EntityManager, Not } from 'typeorm';
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
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Tagset } from '@domain/common/tagset';
import { LogContext } from '@common/enums';
import { asyncReduceSequential } from '@common/utils/async.reduce.sequential';
import { getIndexPattern } from '../get.index.pattern';
import { asyncMap } from '@common/utils/async.map';
import { ElasticResponseError } from '@services/external/elasticsearch/types';
import { SpaceLevel } from '@common/enums/space.level';

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

@Injectable()
export class SearchIngestService {
  private readonly indexPattern: string;
  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private elasticClient: ElasticClient | undefined,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private configService: ConfigService
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
    const indices = [
      `${this.indexPattern}spaces`,
      `${this.indexPattern}organizations`,
      `${this.indexPattern}users`,
      `${this.indexPattern}posts`,
    ];

    const results = await asyncMap(indices, async index => {
      if (!(await this.elasticClient!.indices.exists({ index }))) {
        return { acknowledged: true };
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

  public async ingest(): Promise<IngestReturnType> {
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
        index: `${this.indexPattern}spaces`,
        fetchFn: this.fetchSpacesLevel1.bind(this),
        batchSize: 100,
      },
      {
        index: `${this.indexPattern}spaces`,
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
        batchSize: 10,
      },
    ];

    return asyncReduceSequential(
      params,
      async (acc, { index, fetchFn, batchSize }) => {
        const batches = await this.fetchAndIngest(index, fetchFn, batchSize);
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
    batchSize: number
  ): Promise<IngestBatchResultType[]> {
    let start = 0;
    const results: IngestBatchResultType[] = [];

    while (true) {
      const fetched = await fetchFn(start, batchSize);
      // if there are no results fetched, we have reached the end
      if (!fetched.length) {
        break;
      }

      results.push(await this.ingestBulk(fetched, index));
      // some statement are not directly querying a table, but instead parent entities
      // so the total count is not predictable; in that case an extra query has to be made
      // to ensure there is no more data
      if (!fetched.length) {
        break;
      }

      start += batchSize;
      // delay between batches
      await setTimeout(1000);
    }

    return results;
  }

  private async ingestBulk(
    data: unknown[],
    index: string
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
      const message = `${erroredDocuments.length} documents errored. ${
        data.length - erroredDocuments.length
      } documents indexed.`;
      this.logger.error(message, undefined, LogContext.SEARCH_INGEST);
      return {
        success: false,
        total: 0,
        message,
        erroredDocuments: erroredDocuments,
      };
    } else {
      const message = `${data.length} documents indexed`;
      this.logger.verbose?.(message, LogContext.SEARCH_INGEST);
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
          profile: {
            ...user.profile,
            tags: processTagsets(user.profile.tagsets),
            tagsets: undefined,
          },
        }))
      );
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
        const spaceLevel0Posts: any[] = [];
        spaces.forEach(space =>
          space?.collaboration?.callouts?.forEach(callout =>
            callout?.contributions?.forEach(contribution => {
              if (!contribution.post) {
                return;
              }
              spaceLevel0Posts.push({
                ...contribution.post,
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
        const spaceLevel1Posts: any[] = [];
        spaces.forEach(space =>
          space?.subspaces?.forEach(subspace =>
            subspace?.collaboration?.callouts?.forEach(callout =>
              callout?.contributions?.forEach(contribution => {
                if (!contribution.post) {
                  return;
                }
                spaceLevel1Posts.push({
                  ...contribution.post,
                  license: {
                    visibility:
                      space?.account?.license?.visibility ?? EMPTY_VALUE,
                  },
                  spaceID: space.id,
                  challengeID: subspace.id,
                  calloutID: callout.id,
                  collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                  profile: {
                    ...contribution.post.profile,
                    tagsets: undefined,
                    tags: processTagsets(contribution.post?.profile?.tagsets),
                  },
                });
              })
            )
          )
        );
        const spaceLevel2Posts: any[] = [];
        spaces.forEach(space =>
          space?.subspaces?.forEach(subspace =>
            subspace?.subspaces?.forEach(subsubspace =>
              subsubspace?.collaboration?.callouts?.forEach(callout =>
                callout?.contributions?.forEach(contribution => {
                  if (!contribution.post) {
                    return;
                  }
                  spaceLevel2Posts.push({
                    ...contribution.post,
                    license: {
                      visibility:
                        space?.account?.license?.visibility ?? EMPTY_VALUE,
                    },
                    spaceID: space.id,
                    challengeID: subspace.id,
                    opportunityID: subsubspace.id,
                    calloutID: callout.id,
                    collaborationID: space?.collaboration?.id ?? EMPTY_VALUE,
                    profile: {
                      ...contribution.post.profile,
                      tagsets: undefined,
                      tags: processTagsets(contribution.post?.profile?.tagsets),
                    },
                  });
                })
              )
            )
          )
        );

        return [...spaceLevel0Posts, ...spaceLevel1Posts, ...spaceLevel2Posts];
      });
  }
}

const processTagsets = (tagsets: Tagset[] | undefined) => {
  return tagsets?.flatMap(tagset => tagset.tags).join(' ');
};
