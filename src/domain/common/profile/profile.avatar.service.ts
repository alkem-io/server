import { LogContext } from '@common/enums/logging.context';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { KratosSessionData } from '@core/authentication/kratos.session';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class ProfileAvatarService {
  constructor(
    private profileService: ProfileService,
    private avatarCreatorService: AvatarCreatorService,
    private storageBucketService: StorageBucketService,
    private documentService: DocumentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /** Host only — the full avatar URL can carry provider signing tokens. */
  private getHost(urlString?: string): string | undefined {
    if (!urlString) {
      return undefined;
    }
    try {
      return new URL(urlString).host;
    } catch {
      return undefined;
    }
  }

  private isValidHttpUrl(urlString: string): boolean {
    let url;

    try {
      url = new URL(urlString);
    } catch {
      return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  public async addAvatarVisualToProfile(
    profile: IProfile,
    profileData: CreateProfileInput,
    kratosData?: KratosSessionData,
    firstName?: string,
    lastName?: string
  ): Promise<void> {
    let avatarURL: string | undefined;
    const avatarUrlFromProfile = profileData.visuals?.find(
      visual => visual.name === VisualType.AVATAR
    )?.uri;
    const avatarUrlFromKratos = kratosData?.avatarURL;
    if (avatarUrlFromProfile && this.isValidHttpUrl(avatarUrlFromProfile)) {
      // Avatar has been explicitly set
      avatarURL = avatarUrlFromProfile;
    } else if (
      avatarUrlFromKratos &&
      this.isValidHttpUrl(avatarUrlFromKratos)
    ) {
      // Pick up the avatar from Kratos session
      avatarURL = avatarUrlFromKratos;
    } else {
      // Generate a random avatar
      let avatarFirstName = profileData.displayName;
      if (firstName) {
        avatarFirstName = firstName;
      }
      avatarURL = this.avatarCreatorService.generateRandomAvatarURL(
        avatarFirstName,
        lastName
      );
    }
    const avatarVisual = [
      {
        name: VisualType.AVATAR,
        uri: avatarURL,
      },
    ];
    await this.profileService.addVisualsOnProfile(profile, avatarVisual, [
      VisualType.AVATAR,
    ]);
  }

  public async ensureAvatarIsStoredInLocalStorageBucket(
    profileID: string,
    userID?: string
  ): Promise<IProfile> {
    const profile = await this.profileService.getProfileOrFail(profileID, {
      relations: {
        visuals: true,
        storageBucket: true,
      },
    });
    let sourceURI: string | undefined;
    try {
      if (!profile.visuals || !profile.storageBucket) {
        throw new EntityNotInitializedException(
          `Profile could not be loaded with all entities for avatar check: ${profile.id}`,
          LogContext.COMMUNITY
        );
      }
      const avatarVisual = profile.visuals.find(
        visual => visual.name === VisualType.AVATAR
      );
      if (!avatarVisual) {
        throw new EntityNotFoundException(
          `Unable to load avatar visual on profile: ${profile.id}`,
          LogContext.COMMUNITY
        );
      }

      const uri = avatarVisual.uri;
      sourceURI = uri;
      const avatarDocument =
        await this.storageBucketService.ensureAvatarUrlIsDocument(
          uri,
          profile.storageBucket.id,
          userID
        );
      const avatartURI =
        this.documentService.getPubliclyAccessibleURL(avatarDocument);
      avatarVisual.uri = avatartURI;
    } catch (error: any) {
      // This method should never stop the creation of a contributor, so the
      // failure is swallowed and the Profile keeps whatever (external) avatar
      // URI it already had. Log it as structured data so the silent fallback
      // stays greppable and alertable: `avatarHost` identifies a CDN that has
      // started rejecting us, `httpStatus` separates a block (403) from a dead
      // link (404) or an outage (5xx).
      this.logger.error(
        {
          msg: 'AVATAR_NOT_STORED_LOCALLY',
          name: ProfileAvatarService.name,
          profileID: profile.id,
          avatarHost: this.getHost(sourceURI),
          httpStatus: error?.httpStatus,
          errorCode: error?.errorCode,
          error: error?.message,
        },
        error?.stack,
        LogContext.COMMUNITY
      );
    }
    return await this.profileService.save(profile);
  }
}
