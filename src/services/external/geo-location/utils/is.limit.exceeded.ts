import { GeoLocationCacheMetadata } from '../geo.location.cache.metadata';

export const isLimitExceeded = (
  cacheMetadata: GeoLocationCacheMetadata,
  allowedCallsToService: number
) => {
  // the cache will be invalidated when the time window is reset
  // so no need for checking if it's within the time window
  return cacheMetadata.calls >= allowedCallsToService;
};
