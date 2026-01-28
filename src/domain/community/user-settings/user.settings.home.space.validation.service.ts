import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { groupCredentialsByEntity } from '@services/api/roles/util/group.credentials.by.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class UserSettingsHomeSpaceValidationService {
  constructor(
    private spaceLookupService: SpaceLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Validates that the user has access to the specified space.
   * @throws ValidationException if user doesn't have access or space doesn't exist
   */
  async validateSpaceAccess(
    spaceID: string,
    agentInfo: AgentInfo
  ): Promise<void> {
    // First verify space exists
    await this.spaceLookupService.getSpaceOrFail(spaceID);

    // Check user has credentials for this space
    const credentialMap = groupCredentialsByEntity(agentInfo.credentials);
    const userSpaces = credentialMap.get('spaces');

    if (!userSpaces || !userSpaces.has(spaceID)) {
      throw new ValidationException(
        'User does not have access to the specified space',
        LogContext.COMMUNITY,
        { spaceID }
      );
    }
  }

  /**
   * Checks if user still has access to their home space.
   * Returns false if space doesn't exist or user lost access.
   */
  async isHomeSpaceValid(
    spaceID: string | null | undefined,
    agentInfo: AgentInfo
  ): Promise<boolean> {
    if (!spaceID) {
      return false;
    }

    try {
      await this.validateSpaceAccess(spaceID, agentInfo);
      return true;
    } catch {
      return false;
    }
  }
}
