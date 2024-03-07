import { EntityManager } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@common/constants';
import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user';
import { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
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

@Injectable()
export class SearchIngestService {
  private readonly client: ElasticClient;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private readonly elasticClient: ElasticClient | undefined,
    @InjectEntityManager()
    private readonly entityManager: EntityManager
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
    return;

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
      console.log(erroredDocuments);
    }
  }
  // todo: process return object for ingestion
  private fetchSpaces() {
    return this.entityManager
      .find<Space>(Space, {
        ...journeyFindOptions,
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
        spaces.forEach(space => {
          (space.profile as any).tags = processTagsets(space.profile.tagsets);
          delete space.profile.tagsets;
          return spaces;
        });
        return spaces;
      });
  }

  private fetchChallenges() {
    return this.entityManager
      .find<Challenge>(Challenge, {
        ...journeyFindOptions,
        relations: {
          ...journeyFindOptions.relations,
          parentSpace: {
            license: true,
          },
        },
        select: {
          ...journeyFindOptions.select,
          parentSpace: {
            license: {
              visibility: true,
            },
          },
        },
      })
      .then(challenges =>
        challenges.filter(
          challenge =>
            challenge?.parentSpace?.license?.visibility !==
            SpaceVisibility.ARCHIVED
        )
      )
      .then(challenges => {
        challenges.forEach(challenge => {
          (challenge.profile as any).tags = processTagsets(
            challenge.profile.tagsets
          );
          delete challenge.parentSpace;
          delete challenge.profile.tagsets;
        });
        return challenges;
      });
  }

  private fetchOpportunities() {
    return this.entityManager
      .find<Opportunity>(Opportunity, {
        ...journeyFindOptions,
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
            parentSpace: {
              license: {
                visibility: true,
              },
            },
          },
        },
      })
      .then(opportunities =>
        opportunities.filter(
          opportunity =>
            opportunity.challenge?.parentSpace?.license?.visibility !==
            SpaceVisibility.ARCHIVED
        )
      )
      .then(opportunities => {
        opportunities.forEach(opportunity => {
          (opportunity.profile as any).tags = processTagsets(
            opportunity.profile.tagsets
          );
          delete opportunity.profile.tagsets;
          delete opportunity.challenge;
        });
        return opportunities;
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
        organizations.forEach(organization => {
          (organization.profile as any).tags = processTagsets(
            organization.profile.tagsets
          );
          delete organization.profile.tagsets;
        });
        return organizations;
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
      .find(Space, {
        loadEagerRelations: false,
        relations: {
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
          collaboration: {
            id: true,
            callouts: {
              id: true,
              contributions: {
                id: true,
                post: {
                  id: true,
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
                spaceId: space.id,
                profile: {
                  ...contribution.post.profile,
                  tagsets: undefined,
                  tags: processTagsets(contribution.post?.profile?.tagsets),
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
                  spaceId: space.id,
                  challengeId: challenge.id,
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
                    spaceId: space.id,
                    challengeId: challenge.id,
                    opportunityId: opportunity.id,
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
