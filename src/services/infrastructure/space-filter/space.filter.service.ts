import { SpaceVisibility } from '@common/enums/space.visibility';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceFilterInput } from './dto/space.filter.dto.input';

export class SpaceFilterService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getAllowedVisibilities(
    filter: SpaceFilterInput | undefined
  ): SpaceVisibility[] {
    let visibilities = [SpaceVisibility.ACTIVE];
    if (filter && filter.visibilities && filter.visibilities.length > 0) {
      visibilities = filter.visibilities;
    }
    this.logger.verbose?.(
      `Loading spaces with visibilities: ${visibilities}`,
      LogContext.CHALLENGES
    );
    return visibilities;
  }

  public isVisible(
    visibility: SpaceVisibility | undefined,
    allowedVisibilities: SpaceVisibility[]
  ): boolean {
    if (!visibility) {
      throw new RelationshipNotFoundException(
        `Space Visibility not provided when searching for ${allowedVisibilities}`,
        LogContext.CHALLENGES
      );
    }
    const result = allowedVisibilities.find(v => v === visibility);
    if (result) return true;
    return false;
  }
}
