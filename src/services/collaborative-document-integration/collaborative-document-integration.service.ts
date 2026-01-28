import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MemoService } from '@domain/common/memo';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoContributionsInputData } from '@services/collaborative-document-integration/inputs/memo.contributions.input.data';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import {
  FetchInputData,
  InfoInputData,
  SaveInputData,
  WhoInputData,
} from './inputs';
import {
  FetchContentData,
  FetchErrorData,
  FetchOutputData,
  InfoOutputData,
  SaveContentData,
  SaveErrorData,
  SaveOutputData,
} from './outputs';
import { FetchErrorCodes, SaveErrorCodes } from './types';

type AccessGrantedInputData = {
  userId: string;
  documentId: string;
  privilege: AuthorizationPrivilege;
};

@Injectable()
export class CollaborativeDocumentIntegrationService {
  private readonly maxCollaboratorsInRoom: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: WinstonLogger,
    private readonly authorizationService: AuthorizationService,
    private readonly authenticationService: AuthenticationService,
    private readonly agentInfoService: AgentInfoService,
    private readonly memoService: MemoService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly contributionReporter: ContributionReporterService,
    private readonly communityResolver: CommunityResolverService
  ) {
    this.maxCollaboratorsInRoom = this.configService.get(
      'collaboration.memo.max_collaborators_in_room',
      { infer: true }
    );
  }

  public async accessGranted(data: AccessGrantedInputData): Promise<boolean> {
    try {
      const memo = await this.memoService.getMemoOrFail(data.documentId);
      const agentInfo = await this.agentInfoService.buildAgentInfoForUser(
        data.userId
      );

      return this.authorizationService.isAccessGranted(
        agentInfo,
        memo.authorization,
        data.privilege
      );
    } catch (e: any) {
      this.logger.error(
        e?.message,
        e?.stack,
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );
      return false;
    }
  }

  public async info({
    userId,
    documentId,
  }: InfoInputData): Promise<InfoOutputData> {
    const read = await this.accessGranted({
      userId,
      documentId,
      privilege: AuthorizationPrivilege.READ,
    });

    if (!read) {
      return {
        read: false,
        update: false,
        isMultiUser: false,
        maxCollaborators: 0,
      };
    }

    const update = await this.accessGranted({
      userId,
      documentId,
      privilege: AuthorizationPrivilege.UPDATE_CONTENT,
    });

    const isMultiUser = await this.memoService.isMultiUser(documentId);

    const maxCollaborators = isMultiUser ? this.maxCollaboratorsInRoom : 1;

    return { read, update, isMultiUser, maxCollaborators };
  }

  public who(data: WhoInputData): Promise<AgentInfo> {
    return this.authenticationService.getAgentInfo(data.auth);
  }

  public async save({
    documentId,
    binaryStateInBase64,
  }: SaveInputData): Promise<SaveOutputData> {
    const binaryState = Buffer.from(binaryStateInBase64, 'base64');
    // try saving
    try {
      await this.memoService.saveContent(documentId, binaryState);
    } catch (e: any) {
      const message = e?.message ?? JSON.stringify(e);
      this.logger.error(
        message,
        e?.stack,
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );
      const code = convertExceptionToSaveErrorCode(e);
      return new SaveOutputData(new SaveErrorData(message, code));
    }
    // return success on successful save
    return new SaveOutputData(new SaveContentData());
  }

  public async fetch(data: FetchInputData): Promise<FetchOutputData> {
    try {
      const memo = await this.memoService.getMemoOrFail(data.documentId, {
        loadEagerRelations: false,
        select: { id: true, content: true },
      });

      const contentBase64 =
        memo.content != undefined ? memo.content.toString('base64') : undefined;

      return new FetchOutputData(new FetchContentData(contentBase64));
    } catch (e: any) {
      this.logger.error(
        e?.message,
        e?.stack,
        LogContext.COLLAB_DOCUMENT_INTEGRATION
      );

      const code = convertExceptionToFetchErrorCode(e);

      return new FetchOutputData(
        new FetchErrorData(
          'An error occurred while fetching the content.',
          code
        )
      );
    }
  }

  public async memoContributions({
    memoId,
    users,
  }: MemoContributionsInputData): Promise<void> {
    const community =
      await this.communityResolver.getCommunityForMemoOrFail(memoId);
    const levelZeroSpaceID =
      await this.communityResolver.getLevelZeroSpaceIdForCommunity(
        community.id
      );
    const { displayName } = await this.memoService.getProfile(memoId);

    users.forEach(({ id, email }) => {
      this.contributionReporter.memoContribution(
        {
          id: memoId,
          name: displayName,
          space: levelZeroSpaceID,
        },
        { id, email }
      );
    });
  }
}

const convertExceptionToFetchErrorCode = (
  exception: Error
): FetchErrorCodes => {
  const defaultCode = FetchErrorCodes.INTERNAL_ERROR;
  if (exception instanceof EntityNotFoundException) {
    return FetchErrorCodes.NOT_FOUND;
  }

  return defaultCode;
};

const convertExceptionToSaveErrorCode = (exception: Error): SaveErrorCodes => {
  const defaultCode = SaveErrorCodes.INTERNAL_ERROR;
  if (exception instanceof EntityNotFoundException) {
    return SaveErrorCodes.NOT_FOUND;
  }

  return defaultCode;
};
