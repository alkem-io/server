import { AuthorizationService } from '@core/authorization/authorization.service';
import { Injectable } from '@nestjs/common';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';

@Injectable()
export class UrlResolverService {
  constructor(private authorizationService: AuthorizationService) {}

  public async resolveUrl(url: string): Promise<UrlResolverQueryResults> {
    const pathElements = this.getPathElements(url);

    const result: UrlResolverQueryResults = {
      spaceId: pathElements[0],
    };
    return result;
  }

  private getPathElements(url: string): string[] {
    const parsedUrl = new URL(url);

    const pathElements = parsedUrl.pathname.split('/').filter(Boolean);
    return pathElements;
  }
}

// [
//   'building-alkemio',
//   'challenges',
//   'understandingusage-6722',
//   'collaboration',
//   'reportstounderstan-3845',
//   'posts',
//   'alkemioteamusage-3942',
// ];
