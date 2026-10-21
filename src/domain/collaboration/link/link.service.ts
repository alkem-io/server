import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CreateLinkInput } from './dto/link.dto.create';
import { UpdateLinkInput } from './dto/link.dto.update';
import { Link } from './link.entity';
import { ILink } from './link.interface';

@Injectable()
export class LinkService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private profileDocumentsService: ProfileDocumentsService,
    @InjectRepository(Link)
    private linkRepository: Repository<Link>
  ) {}

  public async createLink(
    linkData: CreateLinkInput,
    storageAggregator: IStorageAggregator
  ): Promise<ILink> {
    const link: ILink = Link.create(linkData);

    link.authorization = new AuthorizationPolicy(AuthorizationPolicyType.LINK);

    link.profile = await this.profileService.createProfile(
      linkData.profile,
      ProfileType.CONTRIBUTION_LINK,
      storageAggregator
    );

    return link;
  }

  /**
   * Phase-2 materialization for a Link. Composed under callout-framing or
   * callout-contribution; the parent entity's save persists the bucket
   * before this is called. Re-homes any markdown URLs/references in
   * `link.profile`, and the file the link itself points at, under the same
   * copy rule as every other file, and lets the supplied `rollback` cascade to
   * the top-level parent on failure.
   *
   * The linked file belongs in `fileStorage`: by default the link's own
   * profile bucket (a contribution link is authorized down to it). A callout
   * framing link is not authorized below the framing, so its file belongs in
   * the framing's bucket, where the callout's uploads already land.
   */
  public async materializeLinkContent(
    link: ILink,
    linkData: CreateLinkInput | undefined,
    rollback: () => Promise<unknown>,
    actorContext?: ActorContext,
    fileStorage?: { bucket?: IStorageBucket; sourceStorageBucketID?: string }
  ): Promise<void> {
    await this.profileService.materializeProfileContentAndVisualsOrRollback(
      link.profile,
      linkData?.profile,
      [],
      rollback,
      actorContext
    );
    const storageBucket = fileStorage
      ? fileStorage.bucket
      : link.profile?.storageBucket;
    const sourceStorageBucketID = fileStorage
      ? fileStorage.sourceStorageBucketID
      : linkData?.profile?.sourceStorageBucketID;
    if (!link.uri || !storageBucket) {
      return;
    }
    try {
      const uri =
        await this.profileDocumentsService.reuploadFileOnStorageBucket(
          link.uri,
          storageBucket,
          false,
          { sourceStorageBucketID, actorContext }
        );
      if (uri && uri !== link.uri) {
        link.uri = uri;
        await this.linkRepository.update({ id: link.id }, { uri });
      }
    } catch (error) {
      await rollback();
      throw error;
    }
  }

  public async updateLink(linkData: UpdateLinkInput): Promise<ILink> {
    const link = await this.getLinkOrFail(linkData.ID, {
      relations: { profile: true },
    });
    if (linkData.profile) {
      link.profile = await this.profileService.updateProfile(
        link.profile,
        linkData.profile
      );
    }

    if (linkData.uri) link.uri = linkData.uri;

    return this.save(link);
  }

  async deleteLink(linkId: string): Promise<ILink> {
    const link = await this.getLinkOrFail(linkId, {
      relations: {
        profile: true,
      },
    });
    if (link.profile) {
      await this.profileService.deleteProfile(link.profile.id);
    }

    if (link.authorization) {
      await this.authorizationPolicyService.delete(link.authorization);
    }

    const result = await this.linkRepository.remove(link as Link);
    result.id = linkId;
    return result;
  }

  async save(link: ILink): Promise<ILink> {
    return await this.linkRepository.save(link);
  }

  public async getLinkOrFail(
    linkID: string,
    options?: FindOneOptions<Link>
  ): Promise<ILink | never> {
    const link = await this.linkRepository.findOne({
      where: { id: linkID },
      ...options,
    });

    if (!link)
      throw new EntityNotFoundException(
        `No Link found with the given id: ${linkID}`,
        LogContext.COLLABORATION
      );
    return link;
  }

  public async getProfile(
    linkInput: ILink,
    relations?: FindOptionsRelations<ILink>
  ): Promise<IProfile> {
    const link = await this.getLinkOrFail(linkInput.id, {
      relations: { profile: true, ...relations },
    });
    if (!link.profile)
      throw new EntityNotFoundException(
        `Link profile not initialised: ${linkInput.id}`,
        LogContext.COLLABORATION
      );

    return link.profile;
  }
}
