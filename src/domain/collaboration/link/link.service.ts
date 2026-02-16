import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { links } from './link.schema';
import { CreateLinkInput } from './dto/link.dto.create';
import { UpdateLinkInput } from './dto/link.dto.update';
import { Link } from './link.entity';
import { ILink } from './link.interface';

@Injectable()
export class LinkService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  public async createLink(
    linkData: CreateLinkInput,
    storageAggregator: IStorageAggregator
  ): Promise<ILink> {
    const link: ILink = Link.create(linkData as Partial<Link>);

    link.authorization = new AuthorizationPolicy(AuthorizationPolicyType.LINK);

    link.profile = await this.profileService.createProfile(
      linkData.profile,
      ProfileType.CONTRIBUTION_LINK,
      storageAggregator
    );

    return link;
  }

  public async updateLink(linkData: UpdateLinkInput): Promise<ILink> {
    const link = await this.getLinkOrFail(linkData.ID);
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
    const link = await this.db.query.links.findFirst({
      where: eq(links.id, linkId),
      with: {
        profile: true,
        authorization: true,
      },
    }) as unknown as ILink;

    if (!link)
      throw new EntityNotFoundException(
        `No Link found with the given id: ${linkId}`,
        LogContext.COLLABORATION
      );

    if (link.profile) {
      await this.profileService.deleteProfile(link.profile.id);
    }

    if (link.authorization) {
      await this.authorizationPolicyService.delete(link.authorization);
    }

    await this.db.delete(links).where(eq(links.id, linkId));
    const result = { ...link };
    result.id = linkId;
    return result;
  }

  async save(link: ILink): Promise<ILink> {
    const [result] = await this.db
      .insert(links)
      .values(link as any)
      .onConflictDoUpdate({
        target: links.id,
        set: link as any,
      })
      .returning();
    return result as unknown as ILink;
  }

  public async getLinkOrFail(linkID: string): Promise<ILink | never> {
    const link = await this.db.query.links.findFirst({
      where: eq(links.id, linkID),
      with: {
        profile: true,
        authorization: true,
      },
    }) as unknown as ILink;

    if (!link)
      throw new EntityNotFoundException(
        `No Link found with the given id: ${linkID}`,
        LogContext.COLLABORATION
      );
    return link;
  }

  public async getProfile(linkInput: ILink): Promise<IProfile> {
    const link = await this.db.query.links.findFirst({
      where: eq(links.id, linkInput.id),
      with: {
        profile: true,
      },
    }) as unknown as ILink;

    if (!link?.profile)
      throw new EntityNotFoundException(
        `Link profile not initialised: ${linkInput.id}`,
        LogContext.COLLABORATION
      );

    return link.profile;
  }
}
