import { Injectable, Logger } from '@nestjs/common';
import { SynapseAdminService } from '@services/infrastructure/synapse/synapse-admin.service';

@Injectable()
export class OidcLogoutService {
  private readonly logger = new Logger(OidcLogoutService.name);

  constructor(private readonly synapseAdminService: SynapseAdminService) {}

  async synchronizeMatrixSessions(subject?: string): Promise<number> {
    const email = this.extractEmail(subject);
    if (!email) {
      return 0;
    }
    const removedDevices =
      await this.synapseAdminService.terminateSessionsByEmail(email);

    if (removedDevices > 0) {
      this.logger.log(`Removed ${removedDevices} Matrix devices for ${email}`);
    }

    return removedDevices;
  }

  private extractEmail(subject?: string): string | undefined {
    if (!subject) {
      return undefined;
    }

    if (!subject.includes('|')) {
      return subject;
    }

    const [, email] = subject.split('|');
    return email || subject;
  }
}
