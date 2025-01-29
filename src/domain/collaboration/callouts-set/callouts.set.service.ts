import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, In, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalloutsSet } from './callouts.set.entity';
import { ICalloutsSet } from './callouts.set.interface';
import { CalloutService } from '../callout/callout.service';
import { ICallout } from '../callout/callout.interface';
import { CreateCalloutInput } from '../callout/dto/callout.dto.create';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import {
  CreateTagsetTemplateInput,
  ITagsetTemplate,
} from '@domain/common/tagset-template';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TagsetType } from '@common/enums/tagset.type';
import { CalloutsSetArgsCallouts } from './dto/callouts.set.args.callouts';
import { UpdateCalloutsSortOrderInput } from './dto/callouts.set.dto.update.callouts.sort.order';
import { compact, keyBy } from 'lodash';
import { CreateCalloutsSetInput } from './dto/callouts.set.dto.create';
import { Callout } from '../callout/callout.entity';
import { CreateCalloutOnCalloutsSetInput } from './dto/callouts.set.dto.create.callout';
import { CalloutType } from '@common/enums/callout.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { TagsetTemplateSetService } from '@domain/common/tagset-template-set/tagset.template.set.service';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.interface';
import { CalloutsSetType } from '@common/enums/callouts.set.type';

@Injectable()
export class CalloutsSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    @InjectRepository(CalloutsSet)
    private calloutsSetRepository: Repository<CalloutsSet>,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private tagsetTemplateSetService: TagsetTemplateSetService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createCalloutsSet(
    calloutsSetData: CreateCalloutsSetInput,
    type: CalloutsSetType
  ): ICalloutsSet {
    if (
      !calloutsSetData.calloutGroups ||
      !calloutsSetData.calloutsData ||
      !calloutsSetData.defaultCalloutGroupName
    ) {
      throw new RelationshipNotFoundException(
        'Unable to create CalloutsSet: missing required data',
        LogContext.COLLABORATION
      );
    }
    const calloutsSet: ICalloutsSet = CalloutsSet.create();
    calloutsSet.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUTS_SET
    );
    calloutsSet.type = type;
    calloutsSet.callouts = [];

    calloutsSet.groups = calloutsSetData.calloutGroups;

    calloutsSet.tagsetTemplateSet =
      this.tagsetTemplateSetService.createTagsetTemplateSet();

    const groupTagsetTemplateInput = this.createCalloutGroupTagsetTemplateInput(
      calloutsSet,
      calloutsSetData.defaultCalloutGroupName
    );
    calloutsSet.tagsetTemplateSet = this.addTagsetTemplate(
      calloutsSet,
      groupTagsetTemplateInput
    );

    return calloutsSet;
  }

  async getCalloutsSetOrFail(
    calloutsSetID: string,
    options?: FindOneOptions<CalloutsSet>
  ): Promise<ICalloutsSet | never> {
    const calloutsSet = await CalloutsSet.findOne({
      where: { id: calloutsSetID },
      ...options,
    });
    if (!calloutsSet)
      throw new EntityNotFoundException(
        `CalloutsSet with id(${calloutsSetID}) not found!`,
        LogContext.TEMPLATES
      );
    return calloutsSet;
  }

  public addTagsetTemplate(
    calloutsSet: ICalloutsSet,
    tagsetInput: CreateTagsetTemplateInput
  ): ITagsetTemplateSet {
    if (!calloutsSet.tagsetTemplateSet) {
      throw new EntityNotInitializedException(
        `Unable to load tagset template set for calloutsSet ${calloutsSet.id}`,
        LogContext.COLLABORATION
      );
    }
    calloutsSet.tagsetTemplateSet =
      this.tagsetTemplateSetService.addTagsetTemplate(
        calloutsSet.tagsetTemplateSet,
        tagsetInput
      );
    return calloutsSet.tagsetTemplateSet;
  }

  public async getTagsetTemplatesSet(
    calloutsSetID: string
  ): Promise<ITagsetTemplateSet> {
    const collaboration = await this.getCalloutsSetOrFail(calloutsSetID, {
      relations: { tagsetTemplateSet: true },
    });

    if (!collaboration.tagsetTemplateSet) {
      throw new EntityNotInitializedException(
        `No tagset template set found for callouts Set with the given id: ${calloutsSetID}`,
        LogContext.COLLABORATION
      );
    }

    return collaboration.tagsetTemplateSet;
  }

  public getTagsetTemplate(
    tagsetTemplateSet: ITagsetTemplateSet,
    name: string
  ): ITagsetTemplate | undefined {
    return tagsetTemplateSet.tagsetTemplates.find(
      template => template.name === name
    );
  }

  async deleteCalloutsSet(calloutsSetID: string): Promise<ICalloutsSet> {
    const calloutsSet = await this.getCalloutsSetOrFail(calloutsSetID, {
      relations: {
        authorization: true,
        callouts: true,
      },
    });

    if (calloutsSet.authorization)
      await this.authorizationPolicyService.delete(calloutsSet.authorization);

    if (calloutsSet.callouts) {
      for (const callout of calloutsSet.callouts) {
        await this.calloutService.deleteCallout(callout.id);
      }
    }

    return await this.calloutsSetRepository.remove(calloutsSet as CalloutsSet);
  }

  public getCallout(
    calloutId: string,
    calloutsSetId: string
  ): Promise<ICallout> {
    return this.calloutService.getCalloutOrFail(calloutId, {
      where: { calloutsSet: { id: calloutsSetId } },
      relations: { calloutsSet: true },
    });
  }

  public async getCallouts(calloutsSetID: string): Promise<ICallout[]> {
    const calloutsSet = await this.getCalloutsSetOrFail(calloutsSetID, {
      relations: { callouts: true },
    });
    return calloutsSet.callouts;
  }

  public getCalloutGroupNames(calloutsSet: ICalloutsSet): string[] {
    return calloutsSet.groups.map(group => group.displayName);
  }

  public async addCallouts(
    calloutsSet: ICalloutsSet,
    calloutsData: CreateCalloutInput[],
    storageAggregator: IStorageAggregator,
    userID: string | undefined
  ): Promise<ICallout[]> {
    if (!calloutsSet.tagsetTemplateSet || !calloutsSet.callouts) {
      throw new EntityNotInitializedException(
        `Collaboration (${calloutsSet.id}) not initialised`,
        LogContext.COLLABORATION
      );
    }
    const calloutNameIds: string[] = compact(
      calloutsSet.callouts?.map(callout => callout.nameID)
    );

    const callouts: ICallout[] = [];
    for (const calloutDefault of calloutsData) {
      if (
        !calloutDefault.nameID ||
        calloutNameIds.includes(calloutDefault.nameID)
      ) {
        calloutDefault.nameID =
          this.namingService.createNameIdAvoidingReservedNameIDs(
            calloutDefault.framing.profile.displayName,
            calloutNameIds
          );
        calloutNameIds.push(calloutDefault.nameID);
      }
      if (
        !calloutDefault.isTemplate &&
        calloutDefault.type === CalloutType.POST
      ) {
        calloutDefault.enableComments = true;
      }
      const callout = await this.calloutService.createCallout(
        calloutDefault,
        calloutsSet.tagsetTemplateSet.tagsetTemplates,
        storageAggregator,
        userID
      );
      callouts.push(callout);
    }
    return callouts;
  }

  public async getCalloutsOnCalloutsSet(
    calloutsSet: ICalloutsSet,
    opts: {
      calloutIds?: string[];
      relations?: FindOptionsRelations<Callout>;
    } = {}
  ): Promise<ICallout[]> {
    const { calloutIds, relations } = opts;
    const loadedCollaboration = await this.calloutsSetRepository.findOne({
      where: {
        id: calloutsSet.id,
        callouts: calloutIds ? { id: In(calloutIds) } : undefined,
      },
      relations: { callouts: relations ?? true },
    });

    if (!loadedCollaboration) {
      throw new EntityNotFoundException(
        'Collaboration not found',
        LogContext.COLLABORATION,
        {
          collaborationID: calloutsSet.id,
        }
      );
    }

    if (!loadedCollaboration.callouts) {
      throw new EntityNotFoundException(
        'Callouts not initialised on collaboration',
        LogContext.COLLABORATION,
        {
          collaborationID: calloutsSet.id,
        }
      );
    }

    return loadedCollaboration.callouts;
  }

  private createCalloutGroupTagsetTemplateInput(
    calloutsSet: ICalloutsSet,
    defaultGroup: CalloutGroupName
  ): CreateTagsetTemplateInput {
    const tagsetTemplateData: CreateTagsetTemplateInput = {
      name: TagsetReservedName.CALLOUT_GROUP,
      type: TagsetType.SELECT_ONE,
      allowedValues: this.getCalloutGroupNames(calloutsSet),
      defaultSelectedValue: defaultGroup,
    };
    return tagsetTemplateData;
  }

  public async createCalloutOnCalloutsSet(
    calloutData: CreateCalloutOnCalloutsSetInput,
    userID: string
  ): Promise<ICallout> {
    const collaborationID = calloutData.calloutsSetID;
    const calloutsSet = await this.getCalloutsSetOrFail(collaborationID, {
      relations: { callouts: true, tagsetTemplateSet: true },
    });
    if (!calloutsSet.callouts || !calloutsSet.tagsetTemplateSet) {
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationID}) not initialised`,
        LogContext.CONTEXT
      );
    }
    if (!calloutData.sortOrder) {
      calloutData.sortOrder =
        Math.min(
          ...calloutsSet.callouts.map(callout => callout.sortOrder),
          0 // Needed in case there are no callouts. In that case the first callout will have sortOrder = 1
        ) - 1;
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInCalloutsSet(calloutsSet.id);
    if (calloutData.nameID && calloutData.nameID.length > 0) {
      if (reservedNameIDs.includes(calloutData.nameID)) {
        throw new ValidationException(
          `Unable to create Callout: the provided nameID is already taken: ${calloutData.nameID}`,
          LogContext.SPACES
        );
      }
      // Just use the provided nameID
    } else {
      calloutData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${calloutData.framing.profile.displayName}`,
          reservedNameIDs
        );
    }

    const tagsetTemplates = calloutsSet.tagsetTemplateSet.tagsetTemplates;
    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCalloutsSet(
        calloutsSet.id
      );
    const callout = await this.calloutService.createCallout(
      calloutData,
      tagsetTemplates,
      storageAggregator,
      userID
    );
    // this has the effect of adding the callout to the collaboration
    callout.calloutsSet = calloutsSet;

    return callout;
  }

  async createCallout(
    calloutsSet: ICalloutsSet,
    calloutInput: CreateCalloutInput,
    agentInfo?: AgentInfo
  ): Promise<ICallout> {
    const reservedNameIDs: string[] = [];
    // TODO      await this.namingService.getReservedNameIDsInCalloutsSet(calloutsSet.id);

    if (calloutInput.nameID && calloutInput.nameID.length > 0) {
      if (reservedNameIDs.includes(calloutInput.nameID)) {
        throw new ValidationException(
          `Unable to create Callout: the provided nameID is already taken: ${calloutInput.nameID}`,
          LogContext.SPACES
        );
      }
      // Just use the provided nameID
    } else {
      calloutInput.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${calloutInput.framing.profile.displayName}`,
          reservedNameIDs
        );
    }

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCalloutsSet(
        calloutsSet.id
      );

    // TODO: Implement tagset templates / move from collaboraiton
    const tagsetTemplates: ITagsetTemplate[] = [];
    const callout = await this.calloutService.createCallout(
      calloutInput,
      tagsetTemplates,
      storageAggregator,
      agentInfo?.userID
    );
    callout.calloutsSet = calloutsSet;
    return await this.calloutService.save(callout);
  }

  public async save(calloutsSet: ICalloutsSet): Promise<ICalloutsSet> {
    return await this.calloutsSetRepository.save(calloutsSet);
  }

  public async updateCalloutsSortOrder(
    collaboration: ICalloutsSet,
    sortOrderData: UpdateCalloutsSortOrderInput
  ): Promise<ICallout[]> {
    const collaborationLoaded = await this.getCalloutsSetOrFail(
      collaboration.id,
      {
        relations: { callouts: true },
      }
    );
    const allCallouts = collaborationLoaded.callouts;
    if (!allCallouts)
      throw new EntityNotFoundException(
        `Callout not initialised, no Callouts: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    const calloutsByID = {
      ...keyBy(allCallouts, 'nameID'),
      ...keyBy(allCallouts, 'id'),
    };

    const minimumSortOrder = Math.min(
      ...sortOrderData.calloutIDs
        .map(calloutId => calloutsByID[calloutId]?.sortOrder)
        .filter(sortOrder => sortOrder)
    );
    const modifiedCallouts: ICallout[] = [];

    // Get the callouts specified
    const calloutsInOrder: ICallout[] = [];
    let index = 1;
    for (const calloutID of sortOrderData.calloutIDs) {
      const callout = calloutsByID[calloutID];
      if (!callout) {
        throw new EntityNotFoundException(
          `Callout with requested ID (${calloutID}) not located within current Collaboration: ${collaboration.id}`,
          LogContext.COLLABORATION
        );
      }
      calloutsInOrder.push(callout);
      const newSortOrder = minimumSortOrder + index;
      if (callout.sortOrder !== newSortOrder) {
        callout.sortOrder = newSortOrder;
        modifiedCallouts.push(callout);
      }
      index++;
    }

    await Promise.all(
      modifiedCallouts.map(
        async callout => await this.calloutService.save(callout)
      )
    );

    return calloutsInOrder;
  }
  public async getCalloutsFromCollaboration(
    calloutsSet: ICalloutsSet,
    args: CalloutsSetArgsCallouts,
    agentInfo: AgentInfo
  ): Promise<ICallout[]> {
    const calloutsSetLoaded = await this.getCalloutsSetOrFail(calloutsSet.id, {
      relations: {
        callouts: {
          framing: {
            profile: {
              tagsets: true,
            },
          },
        },
      },
    });
    const allCallouts = calloutsSetLoaded?.callouts;
    if (!allCallouts) {
      throw new EntityNotFoundException(
        `Callouts not initialised on Collaboration: ${calloutsSet.id}`,
        LogContext.COLLABORATION
      );
    }

    // Single pass filter operation
    const groupNames: string[] = [];
    if (args.groups && args.groups.length) {
      for (const group of args.groups) {
        // Validate that the groups are valid
        const groupAllowed = calloutsSet.groups.find(
          g => g.displayName === group
        );
        if (!groupAllowed) {
          throw new ValidationException(
            `Specified group not found: ${group}; allowed groups: ${calloutsSet.groups
              .map(g => g.displayName)
              .join(', ')}`,
            LogContext.COLLABORATION
          );
        }
        groupNames.push(group);
      }
    }
    const availableCallouts = allCallouts.filter(callout => {
      // Check for READ privilege
      const hasAccess = this.hasAgentAccessToCallout(callout, agentInfo);
      if (!hasAccess) return false;

      // Filter by Callout types
      if (args.types && !args.types.includes(callout.type)) {
        return false;
      }

      // Filter by Callout groups
      if (groupNames.length > 0) {
        const hasMatchingTagset = callout.framing.profile.tagsets?.some(
          tagset =>
            tagset.name === TagsetReservedName.CALLOUT_GROUP &&
            tagset.tags.length > 0 &&
            groupNames?.includes(tagset.tags[0])
        );
        if (!hasMatchingTagset) return false;
      }

      // Filter by tagsets
      const tagsetCheck =
        args.tagsets && args.tagsets.length
          ? callout.framing.profile?.tagsets?.some(calloutTagset =>
              args.tagsets?.some(
                argTagset =>
                  argTagset.name === calloutTagset.name &&
                  argTagset.tags.some(argTag =>
                    calloutTagset.tags.includes(argTag)
                  )
              )
            )
          : true;

      return tagsetCheck;
    });

    // parameter order: (a) by IDs (b) by activity (c) shuffle (d) sort order
    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: ICallout[] = [];
      for (const calloutID of args.IDs) {
        const callout = allCallouts.find(callout => callout.id === calloutID);

        if (!callout)
          throw new EntityNotFoundException(
            `Callout with requested ID (${calloutID}) not located within current Collaboration: ${calloutsSet.id}`,
            LogContext.COLLABORATION
          );

        if (!this.hasAgentAccessToCallout(callout, agentInfo)) {
          throw new ForbiddenException(
            `User does not have access to callout: ${callout.id}`,
            LogContext.COLLABORATION
          );
        }

        results.push(callout);
      }
      return results;
    }

    // (b) by activity. First get the activity for all callouts + sort by it; shuffle does not make sense.
    if (args.sortByActivity) {
      for (const callout of availableCallouts) {
        callout.activity = await this.calloutService.getActivityCount(callout);
      }
      const sortedCallouts = availableCallouts.sort((a, b) =>
        a.activity < b.activity ? 1 : -1
      );
      if (args.limit) {
        return sortedCallouts.slice(0, args.limit);
      }
      return sortedCallouts;
    }

    // (c) shuffle
    if (args.shuffle) {
      // No need to sort
      return limitAndShuffle(availableCallouts, args.limit, args.shuffle);
    }

    // (d) by sort order
    let results = availableCallouts;
    if (args.limit) {
      results = limitAndShuffle(availableCallouts, args.limit, false);
    }

    return results.sort((a, b) => (a.sortOrder > b.sortOrder ? 1 : -1));
  }

  private hasAgentAccessToCallout(
    callout: ICallout,
    agentInfo: AgentInfo
  ): boolean {
    switch (callout.visibility) {
      case CalloutVisibility.PUBLISHED:
        return this.authorizationService.isAccessGranted(
          agentInfo,
          callout.authorization,
          AuthorizationPrivilege.READ
        );
      case CalloutVisibility.DRAFT:
        return this.authorizationService.isAccessGranted(
          agentInfo,
          callout.authorization,
          AuthorizationPrivilege.UPDATE
        );
    }
  }

  /**
   * Move callouts that are not in valid groups or flowStates to the default group & first flowState
   * @param callouts
   */
  public moveCalloutsToDefaultGroupAndState(
    validGroupNames: string[],
    validFlowStateNames: string[],
    callouts: {
      framing: {
        profile: {
          tagsets?: {
            name: string;
            type?: TagsetType;
            tags?: string[];
          }[];
        };
      };
    }[]
  ): void {
    const defaultGroupName: string | undefined = validGroupNames?.[0];
    const defaultFlowStateName: string | undefined = validFlowStateNames?.[0];

    for (const callout of callouts) {
      if (!callout.framing.profile.tagsets) {
        callout.framing.profile.tagsets = [];
      }
      let calloutGroupTagset = callout.framing.profile.tagsets?.find(
        tagset => tagset.name === TagsetReservedName.CALLOUT_GROUP
      );
      let flowStateTagset = callout.framing.profile.tagsets?.find(
        tagset => tagset.name === TagsetReservedName.FLOW_STATE
      );

      if (defaultGroupName) {
        if (!calloutGroupTagset) {
          calloutGroupTagset = {
            name: TagsetReservedName.CALLOUT_GROUP,
            type: TagsetType.SELECT_ONE,
            tags: [defaultGroupName],
          };
          callout.framing.profile.tagsets.push(calloutGroupTagset);
        } else {
          const calloutGroup = calloutGroupTagset.tags?.[0];
          if (!calloutGroup || !validGroupNames.includes(calloutGroup)) {
            calloutGroupTagset.tags = [defaultGroupName];
          }
        }
      }
      if (defaultFlowStateName) {
        if (!flowStateTagset) {
          flowStateTagset = {
            name: TagsetReservedName.FLOW_STATE,
            type: TagsetType.SELECT_ONE,
            tags: [defaultFlowStateName],
          };
          callout.framing.profile.tagsets.push(flowStateTagset);
        } else {
          const flowState = flowStateTagset.tags?.[0];
          if (!flowState || !validFlowStateNames.includes(flowState)) {
            flowStateTagset.tags = [defaultFlowStateName];
          }
        }
      }
    }
  }
}
