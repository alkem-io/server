import { setTimeout } from 'timers/promises';
import { EntityManager, Not } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Tagset } from '@domain/common/tagset';
import { LogContext } from '@common/enums';
import { asyncReduceSequential } from '@common/utils/async.reduce.sequential';

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

const journeyFindOptions: FindManyOptions<BaseChallenge> = {
  loadEagerRelations: false,
  relations: {
    context: true,
    profile: profileRelationOptions,
  },
  select: {
    rowId: false,
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

type IngestBulkReturnType = {
  success: boolean;
  message?: string;
  erroredDocuments?: ErroredDocument[];
};
type IngestReturnType = Record<string, IngestBulkReturnType>;

@Injectable()
export class SearchIngestService {
  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private elasticClient: ElasticClient | undefined,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {
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
      'alkemio-data-spaces',
      'alkemio-data-challenges',
      'alkemio-data-opportunities',
      'alkemio-data-organizations',
      'alkemio-data-users',
      'alkemio-data-posts',
    ];
    return this.elasticClient.indices
      .delete({ index: indices })
      .then(x => ({ acknowledged: x.acknowledged }));
  }

  public async ingest() {
    if (!this.elasticClient) {
      return {
        'N/A': {
          success: false,
          message: 'Elasticsearch client not initialized',
        },
      };
    }
    const result: IngestReturnType = {};
    const params = [
      { index: 'alkemio-data-spaces', fetchFn: this.fetchSpaces.bind(this) },
      {
        index: 'alkemio-data-challenges',
        fetchFn: this.fetchChallenges.bind(this),
      },
      {
        index: 'alkemio-data-opportunities',
        fetchFn: this.fetchOpportunities.bind(this),
      },
      {
        index: 'alkemio-data-organizations',
        fetchFn: this.fetchOrganization.bind(this),
      },
      { index: 'alkemio-data-users', fetchFn: this.fetchUsers.bind(this) },
      { index: 'alkemio-data-posts', fetchFn: this.fetchPosts.bind(this) },
    ];

    return asyncReduceSequential(
      params,
      async (acc, { index, fetchFn }) => {
        // introduced some delay between the ingestion of different entities
        // to not overwhelm the elasticsearch cluster
        await setTimeout(500, null);
        acc[index] = await this._ingest(index, fetchFn);
        return acc;
      },
      result
    );
  }

  private async _ingest(
    index: string,
    fetchFn: () => Promise<unknown[]>
  ): Promise<IngestBulkReturnType> {
    const fetched = await fetchFn();
    return this.ingestBulk(fetched, index);
  }

  private async ingestBulk(
    data: unknown[],
    index: string
  ): Promise<IngestBulkReturnType> {
    if (!this.elasticClient) {
      return {
        success: false,
        message: 'Elasticsearch client not initialized',
      };
    }
    // return;

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
        message,
        erroredDocuments: erroredDocuments,
      };
    } else {
      const message = `${data.length} documents indexed`;
      this.logger.verbose?.(message, LogContext.SEARCH_INGEST);
      return {
        success: true,
        message,
      };
    }
  }
  // TODO: validate the loaded data for missing relations - https://github.com/alkem-io/server/issues/3699
  private fetchSpaces() {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: {
          account: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
        },
        relations: {
          ...journeyFindOptions.relations,
          account: { license: true },
        },
        select: {
          ...journeyFindOptions.select,
          account: { id: true, license: { visibility: true } },
        },
      })
      .then(spaces => {
        return spaces.map(space => ({
          ...space,
          account: undefined,
          license: { visibility: space?.account?.license?.visibility },
          profile: {
            ...space.profile,
            tags: processTagsets(space.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchChallenges() {
    return this.entityManager
      .find<Challenge>(Challenge, {
        ...journeyFindOptions,
        where: {
          space: {
            account: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
          },
        },
        relations: {
          ...journeyFindOptions.relations,
          space: {
            account: { license: true },
          },
        },
        select: {
          ...journeyFindOptions.select,
          space: {
            id: true,
            account: { id: true, license: { visibility: true } },
          },
        },
      })
      .then(challenges => {
        return challenges.map(challenge => ({
          ...challenge,
          spaceID: challenge?.space?.id,
          space: undefined,
          account: undefined,
          license: {
            visibility: challenge?.space?.account?.license?.visibility,
          },
          profile: {
            ...challenge.profile,
            tags: processTagsets(challenge.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchOpportunities() {
    return this.entityManager
      .find<Opportunity>(Opportunity, {
        ...journeyFindOptions,
        where: {
          challenge: {
            space: {
              account: {
                license: { visibility: Not(SpaceVisibility.ARCHIVED) },
              },
            },
          },
        },
        relations: {
          ...journeyFindOptions.relations,
          challenge: {
            space: {
              account: { license: true },
            },
          },
        },
        select: {
          ...journeyFindOptions.select,
          challenge: {
            id: true,
            space: {
              id: true,
              account: { id: true, license: { visibility: true } },
            },
          },
        },
      })
      .then(opportunities => {
        return opportunities.map(opportunity => ({
          ...opportunity,
          spaceID: opportunity?.challenge?.space?.id,
          challengeID: opportunity?.challenge?.id,
          challenge: undefined,
          license: {
            visibility:
              opportunity?.challenge?.space?.account?.license?.visibility,
          },
          profile: {
            ...opportunity.profile,
            tags: processTagsets(opportunity.profile.tagsets),
            tagsets: undefined,
          },
        }));
      });
  }

  private fetchOrganization() {
    return this.entityManager
      .find<Organization>(Organization, {
        loadEagerRelations: false,
        relations: {
          profile: profileRelationOptions,
        },
        select: {
          profile: profileSelectOptions,
        },
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

  private fetchUsers() {
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

  private fetchPosts() {
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
          challenges: {
            collaboration: {
              callouts: {
                contributions: {
                  post: {
                    profile: profileRelationOptions,
                  },
                },
              },
            },
            opportunities: {
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
          challenges: {
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
            opportunities: {
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
      })
      .then(spaces => {
        const spacePosts: any[] = [];
        spaces.forEach(space =>
          space?.collaboration?.callouts?.forEach(callout =>
            callout?.contributions?.forEach(contribution => {
              if (!contribution.post) {
                return;
              }
              spacePosts.push({
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
        const challengePosts: any[] = [];
        spaces.forEach(space =>
          space?.challenges?.forEach(challenge =>
            challenge?.collaboration?.callouts?.forEach(callout =>
              callout?.contributions?.forEach(contribution => {
                if (!contribution.post) {
                  return;
                }
                challengePosts.push({
                  ...contribution.post,
                  license: {
                    visibility:
                      space?.account?.license?.visibility ?? EMPTY_VALUE,
                  },
                  spaceID: space.id,
                  challengeID: challenge.id,
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

        const opportunityPosts: any[] = [];
        spaces.forEach(space =>
          space?.challenges?.forEach(challenge =>
            challenge?.opportunities?.forEach(opportunity =>
              opportunity?.collaboration?.callouts?.forEach(callout =>
                callout?.contributions?.forEach(contribution => {
                  if (!contribution.post) {
                    return;
                  }
                  opportunityPosts.push({
                    ...contribution.post,
                    license: {
                      visibility:
                        space?.account?.license?.visibility ?? EMPTY_VALUE,
                    },
                    spaceID: space.id,
                    challengeID: challenge.id,
                    opportunityID: opportunity.id,
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

        return [...spacePosts, ...challengePosts, ...opportunityPosts];
      });
  }
}

const processTagsets = (tagsets: Tagset[] | undefined) => {
  return tagsets?.flatMap(tagset => tagset.tags).join(' ');
};
