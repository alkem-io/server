import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TagsetType } from '@common/enums/tagset.type';
import { CalloutsSetArgsCallouts } from './dto/callouts.set.args.callouts';
import { UpdateCalloutsSortOrderInput } from './dto/callouts.set.dto.update.callouts.sort.order';
import { compact, keyBy } from 'lodash';
import { CreateCalloutsSetInput } from './dto/callouts.set.dto.create';
import { Callout } from '../callout/callout.entity';
import { CreateCalloutOnCalloutsSetInput } from './dto/callouts.set.dto.create.callout';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TagsetTemplateSetService } from '@domain/common/tagset-template-set/tagset.template.set.service';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.interface';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ITagset } from '@domain/common/tagset';
import { TagsetArgs } from '@domain/common/tagset/dto/tagset.args';

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
    private namingService: NamingService
  ) {}

  public createCalloutsSet(
    calloutsSetData: CreateCalloutsSetInput,
    type: CalloutsSetType
  ): ICalloutsSet {
    if (!calloutsSetData.calloutsData) {
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

    calloutsSet.tagsetTemplateSet =
      this.tagsetTemplateSetService.createTagsetTemplateSet();

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
        LogContext.SPACE_ABOUT
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
          LogContext.COLLABORATION
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

  public async validateNameIDNotInUseOrFail(
    calloutsSetID: string,
    nameID: string
  ): Promise<void> {
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInCalloutsSet(calloutsSetID);
    if (reservedNameIDs.includes(nameID)) {
      throw new ValidationException(
        `Provided NameID (${nameID}) is already present in calloutSet (${calloutsSetID}): ${reservedNameIDs}`,
        LogContext.COLLABORATION
      );
    }
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

    const sortOrders = [
      ...sortOrderData.calloutIDs
        .map(calloutId => calloutsByID[calloutId]?.sortOrder)
        .filter(sortOrder => sortOrder !== undefined),
    ];

    const minimumSortOrder =
      sortOrders.length > 0 ? Math.min(...sortOrders) : 0;
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
    const queryTags: boolean = !!args.withTags?.length;

    const calloutsSetLoaded = await this.getCalloutsSetOrFail(calloutsSet.id, {
      relations: {
        callouts: {
          authorization: true,
          classification: {
            tagsets: true,
          },
          ...(queryTags && {
            framing: {
              profile: {
                tagsets: true,
              },
            },
            contributions: {
              post: {
                profile: {
                  tagsets: true,
                },
              },
            },
          }),
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

    const availableCallouts = allCallouts.filter(callout => {
      // Check for READ privilege
      const hasAccess = this.authorizationService.isAccessGranted(
        agentInfo,
        callout.authorization,
        AuthorizationPrivilege.READ
      );

      if (!hasAccess) return false;

      // Filter by Contribution types
      if (
        args.withContributionTypes?.length &&
        !callout.settings.contribution.allowedTypes.some(allowedType =>
          args.withContributionTypes!.includes(allowedType)
        )
      ) {
        return false;
      }

      // Filter by tags
      if (args.withTags?.length) {
        const allCalloutTags = this.getCalloutTags(callout);

        // if none of the provided tags are present in the callout, filter it out
        if (!args.withTags.some(argTag => allCalloutTags.includes(argTag))) {
          return false;
        }
      }

      // Only process classificationTagsets with values specified
      const filteredArgClassificationTagsets =
        args.classificationTagsets?.filter(
          tagset => tagset.tags && tagset.tags.length
        );

      if (
        !filteredArgClassificationTagsets ||
        !filteredArgClassificationTagsets.length
      ) {
        return true;
      }

      // Filter by tagsets
      const tagsetCheck = callout.classification.tagsets?.some(calloutTagset =>
        filteredArgClassificationTagsets.some(
          argTagset =>
            argTagset.name === calloutTagset.name &&
            (!argTagset.tags ||
              argTagset.tags.some(argTag =>
                calloutTagset.tags.some(
                  tag => tag.toLowerCase() === argTag.toLowerCase()
                )
              ))
        )
      );

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

        const hasAccess = this.authorizationService.isAccessGranted(
          agentInfo,
          callout.authorization,
          AuthorizationPrivilege.READ
        );

        if (!hasAccess) {
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

  public async getAllTags(
    calloutsSetID: string,
    classificationTagsets?: TagsetArgs[]
  ): Promise<string[]> {
    const calloutsSet = await this.getCalloutsSetOrFail(calloutsSetID, {
      relations: {
        callouts: {
          framing: {
            profile: {
              tagsets: true,
            },
          },
          classification: {
            tagsets: true,
          },
          contributions: {
            post: {
              profile: {
                tagsets: true,
              },
            },
          },
        },
      },
    });

    const allTags = calloutsSet.callouts
      .filter(this.filterCalloutsByClassificationTagsets(classificationTagsets))
      .flatMap(callout => this.getCalloutTags(callout));

    // return allTags sorted by frequency, then alphabetically
    const tagFrequency: { [key: string]: number } = {};
    for (const tag of allTags) {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    }
    return Object.keys(tagFrequency).sort((a, b) => {
      if (tagFrequency[b] === tagFrequency[a]) {
        return a.localeCompare(b);
      }
      return tagFrequency[b] - tagFrequency[a];
    });
  }

  private filterCalloutsByClassificationTagsets(
    classificationTagsets: TagsetArgs[] = []
  ): (callout: ICallout) => boolean {
    // Only process classificationTagsets with values specified
    const filteredClassificationTagsets = classificationTagsets.filter(
      (tagset): tagset is TagsetArgs & { tags: string[] } =>
        tagset.tags !== undefined && tagset.tags.length > 0
    );

    if (!filteredClassificationTagsets.length) {
      // No filtering needed, return true for all the callouts
      return () => true;
    }

    return (callout: ICallout) => {
      if (!callout.classification?.tagsets?.length) {
        return false;
      }
      // Return true if at least one of the provided tagsets matches
      return callout.classification.tagsets.some(calloutTagset =>
        filteredClassificationTagsets.some(
          argTagset =>
            argTagset.name === calloutTagset.name &&
            argTagset.tags.some(argTag =>
              calloutTagset.tags.some(
                tag => tag.toLowerCase() === argTag.toLowerCase()
              )
            )
        )
      );
    };
  }

  /**
   * Move callouts that are not in valid groups or flowStates to the default group & first flowState
   * @param callouts
   */
  public moveCalloutsToDefaultFlowState(
    validFlowStateNames: string[],
    callouts: {
      id?: string;
      classification?: {
        tagsets?: {
          name: string;
          type?: TagsetType;
          tags?: string[];
        }[];
      };
    }[]
  ): void {
    const defaultFlowStateName: string | undefined = validFlowStateNames?.[0];

    for (const callout of callouts) {
      if (!callout.classification || !callout.classification.tagsets) {
        throw new RelationshipNotFoundException(
          `Callout '${callout.id}' provided without a classification`,
          LogContext.COLLABORATION
        );
      }

      let flowStateTagset = callout.classification.tagsets?.find(
        tagset => tagset.name === TagsetReservedName.FLOW_STATE
      );

      if (defaultFlowStateName) {
        if (!flowStateTagset) {
          flowStateTagset = {
            name: TagsetReservedName.FLOW_STATE,
            type: TagsetType.SELECT_ONE,
            tags: [defaultFlowStateName],
          };
          callout.classification.tagsets.push(flowStateTagset);
        } else {
          const flowState = flowStateTagset.tags?.[0];
          if (!flowState || !validFlowStateNames.includes(flowState)) {
            flowStateTagset.tags = [defaultFlowStateName];
          }
        }
      }
    }
  }

  private getCalloutTags(callout: ICallout): string[] {
    const mapTagsets = (tagsets: (ITagset | undefined)[] = []) =>
      tagsets.flatMap(tagset => tagset?.tags ?? []);

    return [
      // Framing tags
      ...mapTagsets(callout.framing.profile.tagsets),
      // Contribution tags
      ...mapTagsets(
        callout.contributions?.flatMap(contribution => [
          ...(contribution.post?.profile.tagsets ?? []),
          // Whiteboards and links don't have tags for now
          // ...(contribution.whiteboard?.profile.tagsets ?? []),
          // ...(contribution.link?.profile.tagsets ?? []),
          // Memos still cannot be used as contributions
          // ...(contribution.memo?.profile.tagsets ?? [])
          // Do not forget to add them to the query in `getAllTags`
          // and `getCalloutsFromCollaboration` if they become available
        ])
      ),
    ];
  }
}
