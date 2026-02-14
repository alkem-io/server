import { ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { LogContext } from '@common/enums/logging.context';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { knowledgeBases } from './knowledge.base.schema';
import { TagsetService } from '../tagset/tagset.service';
import { CreateKnowledgeBaseInput } from './dto/knowledge.base.dto.create';
import { UpdateKnowledgeBaseInput } from './dto/knowledge.base.dto.update';
import { KnowledgeBase } from './knowledge.base.entity';
import { IKnowledgeBase } from './knowledge.base.interface';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private calloutsSetService: CalloutsSetService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  public async createKnowledgeBase(
    knowledgeBaseData: CreateKnowledgeBaseInput,
    storageAggregator: IStorageAggregator,
    userID: string | undefined
  ): Promise<IKnowledgeBase> {
    let knowledgeBase: IKnowledgeBase = KnowledgeBase.create(knowledgeBaseData as unknown as Partial<KnowledgeBase>);

    knowledgeBase.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.KNOWLEDGE_BASE
    );

    knowledgeBase.calloutsSet = this.calloutsSetService.createCalloutsSet(
      knowledgeBaseData.calloutsSetData,
      CalloutsSetType.KNOWLEDGE_BASE
    );

    // To consider also having the default tagset as a template tagset
    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: [],
    };

    knowledgeBaseData.profile.tagsets = this.tagsetService.updateTagsetInputs(
      knowledgeBase.profile.tagsets,
      [defaultTagset]
    );

    knowledgeBase.profile = await this.profileService.createProfile(
      knowledgeBaseData.profile,
      ProfileType.KNOWLEDGE_BASE,
      storageAggregator
    );

    await this.save(knowledgeBase);
    knowledgeBase = await this.getKnowledgeBaseOrFail(knowledgeBase.id, {
      relations: {
        calloutsSet: { tagsetTemplateSet: true, callouts: true },
      },
    });

    if (!knowledgeBase.calloutsSet) {
      throw new EntityNotFoundException(
        `CalloutsSet not found for KnowledgeBase: ${knowledgeBase.id}`,
        LogContext.COLLABORATION
      );
    }

    if (knowledgeBaseData.calloutsSetData.calloutsData) {
      knowledgeBase.calloutsSet.callouts =
        await this.calloutsSetService.addCallouts(
          knowledgeBase.calloutsSet,
          knowledgeBaseData.calloutsSetData.calloutsData,
          storageAggregator,
          userID
        );
    }

    return knowledgeBase;
  }

  public async updateKnowledgeBase(
    knowledgeBase: IKnowledgeBase,
    knowledgeBaseData: UpdateKnowledgeBaseInput
  ): Promise<IKnowledgeBase> {
    if (knowledgeBaseData.profile) {
      knowledgeBase.profile = await this.profileService.updateProfile(
        knowledgeBase.profile,
        knowledgeBaseData.profile
      );
    }

    return knowledgeBase;
  }

  async delete(knowledgeBaseInput: IKnowledgeBase): Promise<IKnowledgeBase> {
    const knowledgeBaseID = knowledgeBaseInput.id;
    const knowledgeBase = await this.getKnowledgeBaseOrFail(knowledgeBaseID, {
      relations: {
        profile: true,
        calloutsSet: true,
      },
    });
    if (!knowledgeBase.profile || !knowledgeBase.calloutsSet) {
      throw new EntityNotFoundException(
        `Unable to load Profile or CalloutsSet on knowledgeBase:  ${knowledgeBase.id} `,
        LogContext.COLLABORATION
      );
    }
    await this.profileService.deleteProfile(knowledgeBase.profile.id);

    await this.calloutsSetService.deleteCalloutsSet(
      knowledgeBase.calloutsSet.id
    );

    if (knowledgeBase.authorization) {
      await this.authorizationPolicyService.delete(knowledgeBase.authorization);
    }

    await this.db
      .delete(knowledgeBases)
      .where(eq(knowledgeBases.id, knowledgeBaseID));
    return knowledgeBase;
  }

  async save(knowledgeBase: IKnowledgeBase): Promise<IKnowledgeBase> {
    const [updated] = await this.db
      .update(knowledgeBases)
      .set({
        profileId: knowledgeBase.profile?.id,
        calloutsSetId: knowledgeBase.calloutsSet?.id,
      })
      .where(eq(knowledgeBases.id, knowledgeBase.id))
      .returning();
    return updated as unknown as IKnowledgeBase;
  }

  public async getKnowledgeBaseOrFail(
    knowledgeBaseID: string,
    options?: {
      relations?: {
        profile?: boolean;
        calloutsSet?: boolean | { tagsetTemplateSet?: boolean; callouts?: boolean };
        authorization?: boolean;
      };
    }
  ): Promise<IKnowledgeBase | never> {
    const withClause: any = {};
    if (options?.relations) {
      if (options.relations.profile) withClause.profile = true;
      if (options.relations.authorization) withClause.authorization = true;
      if (options.relations.calloutsSet) {
        if (typeof options.relations.calloutsSet === 'object') {
          const nested: any = {};
          if (options.relations.calloutsSet.tagsetTemplateSet) nested.tagsetTemplateSet = true;
          if (options.relations.calloutsSet.callouts) nested.callouts = true;
          withClause.calloutsSet = Object.keys(nested).length > 0 ? { with: nested } : true;
        } else {
          withClause.calloutsSet = true;
        }
      }
    }
    const knowledgeBase = await this.db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.id, knowledgeBaseID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    } as any);

    if (!knowledgeBase)
      throw new EntityNotFoundException(
        `No KnowledgeBase found with the given id: ${knowledgeBaseID}`,
        LogContext.COLLABORATION
      );
    return knowledgeBase as unknown as IKnowledgeBase;
  }

  public async getProfile(
    knowledgeBaseInput: IKnowledgeBase
  ): Promise<IProfile> {
    const knowledgeBase = await this.getKnowledgeBaseOrFail(
      knowledgeBaseInput.id,
      {
        relations: { profile: true },
      }
    );
    if (!knowledgeBase.profile)
      throw new EntityNotFoundException(
        `Callout profile not initialised: ${knowledgeBaseInput.id}`,
        LogContext.COLLABORATION
      );

    return knowledgeBase.profile;
  }

  public async getCalloutsSet(
    knowledgeBaseInput: IKnowledgeBase
  ): Promise<ICalloutsSet> {
    const knowledgeBase = await this.getKnowledgeBaseOrFail(
      knowledgeBaseInput.id,
      {
        relations: { calloutsSet: true },
      }
    );
    if (!knowledgeBase.calloutsSet)
      throw new EntityNotFoundException(
        `Callout profile not initialised: ${knowledgeBaseInput.id}`,
        LogContext.COLLABORATION
      );

    return knowledgeBase.calloutsSet;
  }
}
