import { HubVisibility } from '@common/enums/hub.visibility';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HubFilterInput } from './dto/hub.filter.dto.input';

export class HubFilterService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getAllowedVisibilities(
    filter: HubFilterInput | undefined
  ): HubVisibility[] {
    let visibilities = [HubVisibility.ACTIVE];
    if (filter && filter.visibilities && filter.visibilities.length > 0) {
      visibilities = filter.visibilities;
    }
    this.logger.verbose?.(
      `Loading hubs with visibilities: ${visibilities}`,
      LogContext.CHALLENGES
    );
    return visibilities;
  }

  public isVisible(
    visibility: HubVisibility | undefined,
    allowedVisibilities: HubVisibility[]
  ): boolean {
    if (!visibility) {
      throw new RelationshipNotFoundException(
        `Hub Visibility not provided when searching for ${allowedVisibilities}`,
        LogContext.CHALLENGES
      );
    }
    const result = allowedVisibilities.find(v => v === visibility);
    if (result) return true;
    return false;
  }
}
