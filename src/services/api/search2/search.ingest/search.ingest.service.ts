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

@Injectable()
export class SearchIngestService {
  private readonly client: ElasticClient;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private elasticClient: ElasticClient | undefined,
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {
    // if (!elasticClient) {
    //   throw new Error('Elasticsearch client not initialized');
    // }

    this.client = elasticClient!;
  }

  public async ingest() {
    await this.fetchSpaces().then(spaces =>
      this.ingestBulk(spaces, 'alkemio-data-spaces')
    );
    setTimeout(() => {}, 1000);
    await this.fetchChallenges().then(challenges =>
      this.ingestBulk(challenges, 'alkemio-data-challenges')
    );
    setTimeout(() => {}, 1000);
    await this.fetchOpportunities().then(opportunities =>
      this.ingestBulk(opportunities, 'alkemio-data-opportunities')
    );
    setTimeout(() => {}, 1000);
    await this.fetchOrganization().then(organizations =>
      this.ingestBulk(organizations, 'alkemio-data-organizations')
    );
    setTimeout(() => {}, 1000);
    await this.fetchUsers().then(users =>
      this.ingestBulk(users, 'alkemio-data-users')
    );
    setTimeout(() => {}, 1000);
    await this.fetchPosts().then(posts =>
      this.ingestBulk(posts, 'alkemio-data-posts')
    );
    setTimeout(() => {}, 1000);
  }

  private async ingestBulk(data: unknown[], index: string) {
    // return;

    const operations = data.flatMap(doc => [{ index: { _index: index } }, doc]);

    const bulkResponse = await this.client.bulk({ refresh: true, operations });

    if (bulkResponse.errors) {
      const erroredDocuments: {
        // If the status is 429 it means that you can retry the document,
        // otherwise it's very likely a mapping error, and you should
        // fix the document before to try it again.
        status: number | undefined;
        error: ErrorCause | undefined;
        operation: unknown;
        document: unknown;
      }[] = [];
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
      this.logger.error(erroredDocuments);
    } else {
      this.logger.verbose?.(`All ${data.length} documents have been indexed`);
    }
  }
  // TODO: validate the loaded data for missing relations - https://github.com/alkem-io/server/issues/3699
  private fetchSpaces() {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
        where: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
        relations: {
          ...journeyFindOptions.relations,
          license: true,
        },
        select: {
          ...journeyFindOptions.select,
          license: {
            visibility: true,
          },
        },
      })
      .then(spaces => {
        return spaces.map(space => ({
          ...space,
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
          parentSpace: {
            license: { visibility: Not(SpaceVisibility.ARCHIVED) },
          },
        },
        relations: {
          ...journeyFindOptions.relations,
          parentSpace: {
            license: true,
          },
        },
        select: {
          ...journeyFindOptions.select,
          parentSpace: {
            id: true,
            license: {
              visibility: true,
            },
          },
        },
      })
      .then(challenges => {
        return challenges.map(challenge => ({
          ...challenge,
          parentSpace: undefined,
          license: {
            visibility: challenge?.parentSpace?.license?.visibility,
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
            parentSpace: {
              license: { visibility: Not(SpaceVisibility.ARCHIVED) },
            },
          },
        },
        relations: {
          ...journeyFindOptions.relations,
          challenge: {
            parentSpace: {
              license: true,
            },
          },
        },
        select: {
          ...journeyFindOptions.select,
          challenge: {
            id: true,
            parentSpace: {
              id: true,
              license: {
                visibility: true,
              },
            },
          },
        },
      })
      .then(opportunities => {
        return opportunities.map(opportunity => ({
          ...opportunity,
          challenge: undefined,
          license: {
            visibility:
              opportunity?.challenge?.parentSpace?.license?.visibility,
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
        relations: {
          profile: profileRelationOptions,
        },
        select: {
          profile: profileSelectOptions,
        },
      })
      .then(users => {
        users.forEach(user => {
          (user.profile as any).tags = processTagsets(user.profile.tagsets);
          delete user.profile.tagsets;
        });
        return users;
      });
  }

  private fetchPosts() {
    return this.entityManager
      .find<Space>(Space, {
        loadEagerRelations: false,
        where: { license: { visibility: Not(SpaceVisibility.ARCHIVED) } },
        relations: {
          license: true,
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
          license: { visibility: true },
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
                  visibility: space?.license?.visibility ?? EMPTY_VALUE,
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
                    visibility: space?.license?.visibility ?? EMPTY_VALUE,
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
                      visibility: space?.license?.visibility ?? EMPTY_VALUE,
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
