import { ProfileService } from '@domain/common/profile/profile.service';
import { Injectable } from '@nestjs/common';
import { CreateLinkInput } from './dto/link.dto.create';
import { UpdateLinkInput } from './dto/link.dto.update';
import { ILink } from './link.interface';
import { Link } from './link.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileType } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@Injectable()
export class LinkService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    @InjectRepository(Link)
    private linkRepository: Repository<Link>
  ) {}

  public async createLink(
    linkData: CreateLinkInput,
    storageAggregator: IStorageAggregator
  ): Promise<ILink> {
    const link: ILink = Link.create(linkData);

    link.authorization = new AuthorizationPolicy();

    link.profile = await this.profileService.createProfile(
      linkData.profile,
      ProfileType.CONTRIBUTION_LINK,
      storageAggregator
    );

    return link;
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

    return await this.save(link);
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
    let link: ILink | null = null;
    if (linkID.length === UUID_LENGTH) {
      link = await this.linkRepository.findOne({
        where: { id: linkID },
        ...options,
      });
    }

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
