import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Identity } from '@ory/kratos-client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { KratosSessionData } from '@core/authentication/kratos.session';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { LogContext } from '@common/enums';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { RoleName } from '@common/enums/role.name';
import {
  UserAlreadyRegisteredException,
  UserRegistrationInvalidEmail,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { getEmailDomain } from '@common/utils';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CreateUserInput } from '@domain/community/user/dto/user.dto.create';
import { VisualType } from '@common/enums/visual.type';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';

/**
 * Options for building KratosSessionData from a Kratos Identity.
 */
export interface BuildKratosDataOptions {
  /** Force emailVerified to true (identity already verified by Kratos) */
  forceEmailVerified?: boolean;
}

/**
 * Options for resolving or creating a user from Kratos data.
 */
export interface ResolveOrCreateUserOptions {
  /** Assign user to organization matching their email domain */
  assignToOrgByDomain?: boolean;
  /** Validate that email is verified before creating user */
  requireEmailVerified?: boolean;
}

/**
 * Options for resolving user by authentication ID.
 */
export interface ResolveByAuthIdOptions {
  /** Assign user to organization matching their email domain */
  assignToOrgByDomain?: boolean;
}

/**
 * Result of user resolution/creation.
 */
export interface UserIdentityResult {
  user: IUser;
  outcome: 'existing' | 'linked' | 'created';
}

/**
 * Single source of truth for all Kratos Identity → User operations.
 *
 * This service consolidates:
 * - KratosSessionData building from Identity
 * - User lookup by authenticationID/email
 * - Authentication ID linking for existing users
 * - User creation from Kratos data
 * - Domain-based organization assignment
 */
@Injectable()
export class UserIdentityService {
  constructor(
    private readonly userLookupService: UserLookupService,
    private readonly userService: UserService,
    private readonly kratosService: KratosService,
    private readonly organizationLookupService: OrganizationLookupService,
    private readonly roleSetService: RoleSetService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Builds KratosSessionData from a Kratos Identity.
   * Consolidates all Identity → KratosSessionData mapping logic.
   */
  public buildKratosDataFromIdentity(
    identity: Identity,
    options?: BuildKratosDataOptions
  ): KratosSessionData {
    const oryIdentity = identity as OryDefaultIdentitySchema;
    const traits = (oryIdentity?.traits ?? {}) as unknown as Record<
      string,
      unknown
    >;

    const email = (
      (traits.email as string | undefined) ??
      oryIdentity?.verifiable_addresses?.[0]?.value ??
      ''
    ).toLowerCase();

    const isEmailVerified = Array.isArray(oryIdentity?.verifiable_addresses)
      ? oryIdentity.verifiable_addresses.some(
          addr => addr.via === 'email' && addr.verified
        )
      : false;

    const nameObj = traits?.name as Record<string, unknown> | undefined;

    return {
      authenticationID: oryIdentity?.id ?? '',
      email,
      emailVerified: options?.forceEmailVerified ?? isEmailVerified,
      firstName: (nameObj?.first as string) ?? '',
      lastName: (nameObj?.last as string) ?? '',
      avatarURL: (traits?.picture as string) ?? '',
      expiry: undefined,
    };
  }

  /**
   * Single entry point for resolving or creating a user from Kratos data.
   *
   * Flow:
   * 1. Lookup by authenticationID → return if found
   * 2. Lookup by email → link authenticationID if found
   * 3. Create new user if not found
   * 4. Optionally assign to organization by domain
   */
  public async resolveOrCreateUser(
    kratosData: KratosSessionData,
    options?: ResolveOrCreateUserOptions
  ): Promise<UserIdentityResult> {
    const authId = kratosData.authenticationID?.trim();
    const email = kratosData.email?.trim().toLowerCase();

    // Validate email
    if (!email) {
      throw new UserRegistrationInvalidEmail('Invalid email provided');
    }

    // Validate email verification if required
    if (options?.requireEmailVerified && !kratosData.emailVerified) {
      throw new UserNotVerifiedException(
        `User '${email}' not verified`,
        LogContext.COMMUNITY
      );
    }

    // Step 1: Lookup by authenticationID
    if (authId) {
      const existingByAuth =
        await this.userLookupService.getUserByAuthenticationID(authId);
      if (existingByAuth) {
        this.logger.verbose?.(
          `User ${existingByAuth.id} already linked to authentication ID ${authId}`,
          LogContext.AUTH
        );
        return { user: existingByAuth, outcome: 'existing' };
      }
    }

    // Step 2: Lookup by email
    const existingByEmail = await this.userLookupService.getUserByEmail(email);

    if (existingByEmail) {
      // Link authenticationID if provided
      if (authId) {
        const linkedUser = await this.linkAuthenticationId(
          existingByEmail,
          authId
        );
        return { user: linkedUser, outcome: 'linked' };
      }
      return { user: existingByEmail, outcome: 'existing' };
    }

    // Step 3: Create new user
    const newUser = await this.createUserFromKratosData(kratosData);

    // Step 4: Assign to organization by domain if requested
    if (options?.assignToOrgByDomain) {
      await this.assignUserToOrganizationByDomain(newUser);
    }

    return { user: newUser, outcome: 'created' };
  }

  /**
   * Resolves or creates a user by Kratos authentication ID.
   * This is the main entry point for OIDC/identity resolution flows.
   *
   * Flow:
   * 1. Quick lookup by authenticationID → return if found
   * 2. Fetch identity from Kratos
   * 3. Build KratosSessionData and resolve/create user
   *
   * @returns UserIdentityResult or null if identity not found in Kratos
   */
  public async resolveByAuthenticationId(
    authenticationId: string,
    options?: ResolveByAuthIdOptions
  ): Promise<UserIdentityResult | null> {
    // Step 1: Quick lookup by authenticationID
    const existingUser =
      await this.userLookupService.getUserByAuthenticationID(authenticationId);
    if (existingUser) {
      this.logger.verbose?.(
        `User ${existingUser.id} already linked to authentication ID ${authenticationId}`,
        LogContext.AUTH
      );
      return { user: existingUser, outcome: 'existing' };
    }

    // Step 2: Fetch identity from Kratos
    const identity = await this.kratosService.getIdentityById(authenticationId);
    if (!identity) {
      this.logger.warn?.(
        `No Kratos identity found for authenticationId=${authenticationId}`,
        LogContext.AUTH
      );
      return null;
    }

    // Step 3: Build KratosSessionData and resolve/create user
    // Force emailVerified=true for OIDC bypass (identity already verified by Kratos)
    const kratosData = this.buildKratosDataFromIdentity(identity, {
      forceEmailVerified: true,
    });

    // Validate email is present
    if (!kratosData.email) {
      this.logger.warn?.(
        `Kratos identity ${identity.id} missing email trait`,
        LogContext.AUTH
      );
      return null;
    }

    return await this.resolveOrCreateUser(kratosData, {
      assignToOrgByDomain: options?.assignToOrgByDomain ?? true,
      requireEmailVerified: false, // Already forced to true above
    });
  }

  /**
   * Links an authenticationID to an existing user.
   * Throws if the authenticationID is already linked to another user.
   */
  private async linkAuthenticationId(
    user: IUser,
    authenticationId: string
  ): Promise<IUser> {
    // Check if user already has a different authenticationID
    if (user.authenticationID && user.authenticationID !== authenticationId) {
      const message = `Authentication ID mismatch for user ${user.id}: existing ${user.authenticationID}, incoming ${authenticationId}`;
      this.logger.error?.(message, LogContext.AUTH);
      throw new UserAlreadyRegisteredException(
        `User with email: ${user.email} already registered`
      );
    }

    // Check if already linked
    if (user.authenticationID === authenticationId) {
      return user;
    }

    // Check if authenticationID is available
    const existingWithAuthId =
      await this.userLookupService.getUserByAuthenticationID(authenticationId);
    if (existingWithAuthId && existingWithAuthId.id !== user.id) {
      const message = `Authentication ID ${authenticationId} already linked to user ${existingWithAuthId.id}`;
      this.logger.error?.(message, LogContext.AUTH);
      throw new UserAlreadyRegisteredException(
        'Kratos identity already linked to another user'
      );
    }

    // Link the authenticationID
    (user as User).authenticationID = authenticationId;
    const updatedUser = await this.userRepository.save(user as User);

    this.logger.log?.(
      `Linked authentication ID ${authenticationId} to user ${updatedUser.id}`,
      LogContext.AUTH
    );

    return updatedUser;
  }

  /**
   * Creates a new user from Kratos session data.
   */
  private async createUserFromKratosData(
    kratosData: KratosSessionData
  ): Promise<IUser> {
    const userData: CreateUserInput = {
      email: kratosData.email,
      firstName: kratosData.firstName,
      lastName: kratosData.lastName,
      profileData: {
        visuals: [
          {
            name: VisualType.AVATAR,
            uri: kratosData.avatarURL,
          },
        ],
        displayName: `${kratosData.firstName} ${kratosData.lastName}`.trim(),
      },
    };

    const user = await this.userService.createUser(userData, kratosData);

    this.logger.verbose?.(
      `Created new user ${user.id} from Kratos data`,
      LogContext.AUTH
    );

    return user;
  }

  /**
   * Assigns a user to an organization based on their email domain.
   */
  private async assignUserToOrganizationByDomain(user: IUser): Promise<void> {
    const userEmailDomain = getEmailDomain(user.email);

    const org = await this.organizationLookupService.getOrganizationByDomain(
      userEmailDomain,
      {
        relations: {
          roleSet: true,
          verification: true,
        },
      }
    );

    if (!org) {
      this.logger.verbose?.(
        `Organization matching user's domain '${userEmailDomain}' not found.`,
        LogContext.COMMUNITY
      );
      return;
    }

    const orgSettings = org.settings;
    const orgMatchDomain =
      orgSettings.membership.allowUsersMatchingDomainToJoin;

    if (!orgMatchDomain) {
      this.logger.verbose?.(
        `Organization '${org.id}' setting 'allowUsersMatchingDomainToJoin' is disabled`,
        LogContext.COMMUNITY
      );
      return;
    }

    if (!org.verification || !org.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load roleSet or Verification for Organization for matching user domain ${org.id}`,
        LogContext.COMMUNITY
      );
    }

    if (
      org.verification.status !==
      OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION
    ) {
      this.logger.verbose?.(
        `Organization '${org.id}' not verified`,
        LogContext.COMMUNITY
      );
      return;
    }

    await this.roleSetService.assignActorToRole(
      org.roleSet,
      RoleName.ASSOCIATE,
      user.id
    );

    this.logger.verbose?.(
      `User ${user.id} successfully added to Organization '${org.id}'`,
      LogContext.COMMUNITY
    );
  }
}
