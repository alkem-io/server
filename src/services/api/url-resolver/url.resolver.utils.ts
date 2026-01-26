import { UrlPathElement } from '@common/enums/url.path.element';
import { UrlPathBase } from '@common/enums/url.path.base';
import { match } from 'path-to-regexp';

export const spacePathMatcher = match(
  `/:spaceNameID{/${UrlPathElement.CHALLENGES}/:challengeNameID}{/${UrlPathElement.OPPORTUNITIES}/:opportunityNameID}{/*path}`
);

export const spaceInternalPathMatcherCollaboration = match(
  `/${UrlPathElement.COLLABORATION}/:calloutNameID{/${UrlPathElement.POSTS}/:postNameID}{/${UrlPathElement.WHITEBOARDS}/:whiteboardNameID}{/${UrlPathElement.MEMOS}/:memoNameID}{/*path}`
);

export const spaceInternalPathMatcherCalendar = match(
  `/${UrlPathElement.CALENDAR}/:calendarEventNameId`
);

export const spaceInternalPathMatcherSettings = match(
  `/${UrlPathElement.SETTINGS}/${UrlPathElement.TEMPLATES}{/:templateNameID}{/*path}`
);

export const innovationPackPathMatcher = match(
  `/${UrlPathBase.INNOVATION_PACKS}/:innovationPackNameID{/${UrlPathElement.SETTINGS}}{/:templateNameID}{/*path}`
);

export const virtualContributorPathMatcher = match(
  `/${UrlPathBase.VIRTUAL_CONTRIBUTOR}/:virtualContributorNameID{/${UrlPathElement.KNOWLEDGE_BASE}/:calloutNameID}{/${UrlPathElement.POSTS}/:postNameID}{/${UrlPathElement.MEMOS}/:memoNameID}{/*path}`
);

export const innovationHubPathMatcher = match(
  `/${UrlPathBase.INNOVATION_HUBS}/:innovationHubNameID{/*path}`
);

export const hubPathMatcher = match(
  `/${UrlPathBase.HUB}/:innovationHubNameID{/${UrlPathElement.SETTINGS}}{/*path}`
);

export function getPathElements(url: string): string[] {
  const parsedUrl = new URL(url);
  const pathElements = parsedUrl.pathname.split('/').filter(Boolean);
  return pathElements;
}

export function getPath(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname;
}

export function getMatchedResultAsString(
  matchedResult: string | string[] | undefined
): string | undefined {
  if (!matchedResult) {
    return undefined;
  }
  if (Array.isArray(matchedResult)) {
    return matchedResult[0];
  }
  return matchedResult;
}

export function getMatchedResultAsPath(
  matchedResult: string | string[] | undefined
): string | undefined {
  if (!matchedResult) {
    return undefined;
  }
  if (Array.isArray(matchedResult)) {
    return createPathFromElements(matchedResult);
  }
  return `/${matchedResult}`;
}

export function createPathFromElements(pathElements: string[]): string {
  return '/' + pathElements.join('/');
}
