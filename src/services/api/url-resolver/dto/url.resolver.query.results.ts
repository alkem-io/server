import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UrlResolverQueryResults {
  spaceId?: string;
  subspaceIds?: [string, string] | [string, string, string]; // level0, level1, level2
  subspaceId?: string;
  organizationId?: string;
  innovationPackId?: string;
  innovationHubId?: string;
  templateId?: string;
  calloutsSetId?: string;
  calloutId?: string;
  contributionId?: string;
  postId?: string;
  userId?: string;
  vcId?: string;
}
