import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { IdentityVerificationStatusFilter } from '@common/enums/identity.verification.status.filter';
import { Identity } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { LogContext } from '@common/enums/logging.context';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { KratosIdentityDto } from './dto/kratos.identity.dto';

@Injectable()
export class AdminIdentityService {
  constructor(
    private kratosService: KratosService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Gets all identities from Kratos that have not been verified.
   *
   * @returns A promise that resolves to an array of KratosIdentityDto.
   */
  async getUnverifiedIdentities(): Promise<KratosIdentityDto[]> {
    const unverifiedIdentities =
      await this.kratosService.getUnverifiedIdentities();

    return unverifiedIdentities.map(identity =>
      this.mapToKratosIdentityDto(identity)
    );
  }

  /**
   * Gets identities filtered by verification status.
   *
   * @param filter - The verification status filter.
   * @returns A promise that resolves to an array of KratosIdentityDto.
   */
  async getIdentitiesByVerificationStatus(
    filter: IdentityVerificationStatusFilter = IdentityVerificationStatusFilter.ALL
  ): Promise<KratosIdentityDto[]> {
    let identities: Identity[] = [];

    switch (filter) {
      case IdentityVerificationStatusFilter.VERIFIED:
        identities = await this.kratosService.getVerifiedIdentities();
        break;
      case IdentityVerificationStatusFilter.UNVERIFIED:
        identities = await this.kratosService.getUnverifiedIdentities();
        break;
      case IdentityVerificationStatusFilter.ALL:
      default:
        identities = await this.kratosService.getAllIdentities();
        break;
    }

    return identities.map(identity => this.mapToKratosIdentityDto(identity));
  }

  /**
   * Deletes a Kratos identity by email.
   *
   * @param email - The email of the identity to delete.
   * @returns A promise that resolves when the identity is deleted.
   */
  async deleteIdentityByEmail(email: string): Promise<boolean> {
    try {
      await this.kratosService.deleteIdentityByEmail(email);
    } catch (error) {
      this.logger.error(
        `Error deleting identity with email ${email}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.KRATOS
      );
      return false;
    }
    return true;
  }

  /**
   * Deletes a Kratos identity by ID.
   *
   * @param kratosIdentityId - The ID of the identity to delete.
   * @returns A promise that resolves when the identity is deleted.
   */
  async deleteIdentity(kratosIdentityId: string): Promise<boolean> {
    try {
      await this.kratosService.deleteIdentityById(kratosIdentityId);
    } catch (error) {
      this.logger.error(
        `Error deleting identity with ID ${kratosIdentityId}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
        LogContext.KRATOS
      );
      return false;
    }
    return true;
  }

  /**
   * Maps a Kratos Identity to KratosIdentityDto.
   *
   * @param identity - The Kratos identity to map.
   * @returns The mapped KratosIdentityDto.
   */
  private mapToKratosIdentityDto(identity: Identity): KratosIdentityDto {
    const oryIdentity = identity as OryDefaultIdentitySchema;
    const traits = oryIdentity.traits;

    // Get the primary email address
    const primaryEmail =
      oryIdentity.verifiable_addresses?.[0]?.value ||
      traits?.email ||
      'Unknown';

    // Get verification status
    const verificationStatus =
      oryIdentity.verifiable_addresses?.[0]?.status || 'unknown';

    return {
      id: identity.id,
      email: primaryEmail,
      firstName: traits?.name?.first,
      lastName: traits?.name?.last,
      createdAt: new Date(identity.created_at!),
      verificationStatus,
      isVerified: oryIdentity.verifiable_addresses?.[0]?.verified || false,
    };
  }
}
