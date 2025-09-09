import { Injectable } from '@nestjs/common';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { KratosIdentityDto } from './dto/kratos.identity.dto';
import { PlatformIdentityDto } from './dto/platform.identity.dto';
import { IdentityVerificationStatusFilter } from '@common/enums/identity.verification.status.filter';
import { Identity } from '@ory/kratos-client';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';

@Injectable()
export class AdminIdentityService {
  constructor(private kratosService: KratosService) {}

  /**
   * Gets all identities from Kratos that have not been verified.
   *
   * @returns A promise that resolves to an array of UnverifiedIdentityDto.
   */
  async getUnverifiedIdentities(): Promise<KratosIdentityDto[]> {
    const unverifiedIdentities =
      await this.kratosService.getUnverifiedIdentities();

    return unverifiedIdentities.map(identity =>
      this.mapToUnverifiedIdentityDto(identity)
    );
  }

  /**
   * Gets identities filtered by verification status.
   *
   * @param filter - The verification status filter.
   * @returns A promise that resolves to an array of PlatformIdentityDto.
   */
  async getIdentitiesByVerificationStatus(
    filter: IdentityVerificationStatusFilter = IdentityVerificationStatusFilter.ALL
  ): Promise<PlatformIdentityDto[]> {
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

    return identities.map(identity => this.mapToPlatformIdentityDto(identity));
  }

  /**
   * Maps a Kratos Identity to UnverifiedIdentityDto.
   *
   * @param identity - The Kratos identity to map.
   * @returns The mapped UnverifiedIdentityDto.
   */
  private mapToUnverifiedIdentityDto(identity: Identity): KratosIdentityDto {
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
    };
  }

  /**
   * Maps a Kratos Identity to PlatformIdentityDto.
   *
   * @param identity - The Kratos identity to map.
   * @returns The mapped PlatformIdentityDto.
   */
  private mapToPlatformIdentityDto(identity: Identity): PlatformIdentityDto {
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

    // Check if identity is verified
    const isVerified = oryIdentity.verifiable_addresses
      ? oryIdentity.verifiable_addresses.every(address => address.verified)
      : false;

    return {
      id: identity.id,
      email: primaryEmail,
      firstName: traits?.name?.first,
      lastName: traits?.name?.last,
      createdAt: new Date(identity.created_at!),
      isVerified,
      verificationStatus,
    };
  }
}
