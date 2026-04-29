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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOneOptions,
  FindOptionsRelations,
  Repository,
} from 'typeorm';
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
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>
  ) {}

  public async createKnowledgeBase(
    knowledgeBaseData: CreateKnowledgeBaseInput,
    storageAggregator: IStorageAggregator,
    userID: string | undefined
  ): Promise<IKnowledgeBase> {
    // Phase 1: build entity tree in memory (no file-service-go calls).
    let knowledgeBase: IKnowledgeBase = KnowledgeBase.create(knowledgeBaseData);

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

    // Cascade save populates IDs on the in-memory tree (knowledgeBase,
    // profile, profile.storageBucket, calloutsSet, calloutsSet.tagsetTemplateSet).
    // Capture the return so we keep the same instance — re-fetching here
    // with a partial relation graph would drop `profile.storageBucket`
    // and break the phase-2 materialize at the bottom of this method.
    knowledgeBase = await this.save(knowledgeBase);

    if (!knowledgeBase.calloutsSet) {
      throw new EntityNotFoundException(
        'CalloutsSet not found for KnowledgeBase',
        LogContext.COLLABORATION,
        { knowledgeBaseId: knowledgeBase.id }
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
      // Persist the newly-added callouts so their bucket ids are real
      // before phase-2 materialization tries to FK onto them.
      knowledgeBase = await this.save(knowledgeBase);
    }

    // Phase 2: materialize own profile + walk calloutsSet. On failure,
    // delete the KB; cascade clears nested entities (callouts/profiles/
    // buckets) and the parent caller (VirtualContributorService) will
    // see the thrown error and abort its own creation flow.
    const rollbackKnowledgeBase = (): Promise<unknown> =>
      this.delete(knowledgeBase);
    await this.profileService.materializeProfileContentAndVisualsOrRollback(
      knowledgeBase.profile,
      knowledgeBaseData.profile?.visuals,
      [],
      rollbackKnowledgeBase
    );
    if (knowledgeBase.calloutsSet) {
      await this.calloutsSetService.materializeCalloutsSetContent(
        knowledgeBase.calloutsSet,
        knowledgeBaseData.calloutsSetData?.calloutsData,
        rollbackKnowledgeBase
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

    const result = await this.knowledgeBaseRepository.remove(
      knowledgeBase as KnowledgeBase
    );
    result.id = knowledgeBaseID;
    return result;
  }

  async save(
    knowledgeBase: IKnowledgeBase,
    mgr?: EntityManager
  ): Promise<IKnowledgeBase> {
    if (mgr) return await mgr.save(knowledgeBase as KnowledgeBase);
    return await this.knowledgeBaseRepository.save(knowledgeBase);
  }

  public async getKnowledgeBaseOrFail(
    knowledgeBaseID: string,
    options?: FindOneOptions<KnowledgeBase>
  ): Promise<IKnowledgeBase | never> {
    const knowledgeBase = await this.knowledgeBaseRepository.findOne({
      where: { id: knowledgeBaseID },
      ...options,
    });

    if (!knowledgeBase)
      throw new EntityNotFoundException(
        `No KnowledgeBase found with the given id: ${knowledgeBaseID}`,
        LogContext.COLLABORATION
      );
    return knowledgeBase;
  }

  public async getProfile(
    knowledgeBaseInput: IKnowledgeBase,
    relations?: FindOptionsRelations<IKnowledgeBase>
  ): Promise<IProfile> {
    const knowledgeBase = await this.getKnowledgeBaseOrFail(
      knowledgeBaseInput.id,
      {
        relations: { profile: true, ...relations },
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
    knowledgeBaseInput: IKnowledgeBase,
    relations?: FindOptionsRelations<IKnowledgeBase>
  ): Promise<ICalloutsSet> {
    const knowledgeBase = await this.getKnowledgeBaseOrFail(
      knowledgeBaseInput.id,
      {
        relations: { calloutsSet: true, ...relations },
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
