import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SearchIngestService } from '@services/api/search/v2/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TaskStatus } from '@domain/task/dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { ExcalidrawContent } from '@common/interfaces';

@Resolver()
export class AdminSearchIngestResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService,
    private taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    @InjectEntityManager() private entityManager: EntityManager
  ) {}

  @Mutation(() => Boolean)
  async iterateOverWhiteboard() {
    const chunkSize = 50;
    let offset = 0;
    let whiteboards: Whiteboard[];

    let withUrl = 0;
    let withDataUrl = 0;
    let withBoth = 0;
    let withoutFileStore = 0;

    const domainSet = new Set<string>();

    do {
      whiteboards = await this.entityManager.find(Whiteboard, {
        skip: offset,
        take: chunkSize,
        loadEagerRelations: false,
        select: {
          id: true,
          content: true,
          updatedDate: true,
        },
      });

      for (const whiteboard of whiteboards) {
        let ec: ExcalidrawContent | undefined;

        if (!whiteboard.content) {
          console.log(`whiteboard ${whiteboard.id} has no content`);
          continue;
        }

        try {
          ec = JSON.parse(whiteboard.content) as ExcalidrawContent;
        } catch (e) {
          console.log(`whiteboard ${whiteboard.id} has invalid content`);
        }

        if (!ec) {
          continue;
        }

        if (!ec.files) {
          console.error(`whiteboard ${whiteboard.id} does not have file store`);
          withoutFileStore++;
          continue;
        }

        const files = Object.entries(ec.files);

        for (const [, file] of files) {
          if (file.url) {
            withUrl++;
            const regex = /https:\/\/(.*?)\/api/;
            const match = file.url.match(regex);

            if (match) {
              domainSet.add(match[1]);
            }
          }

          if (file.dataURL) {
            withDataUrl++;
          }

          if (file.url && file.dataURL) {
            withBoth++;
          }
        }
      }

      offset += chunkSize;
    } while (whiteboards.length === chunkSize);

    console.log('withUrl', withUrl);
    console.log('withDataUrl', withDataUrl);
    console.log('withBoth', withBoth);
    console.log('withoutFileStore', withoutFileStore);
    console.log('domainSet', domainSet.values());

    return true;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation.',
  })
  @Profiling.api
  async adminSearchIngestFromScratch(@CurrentUser() agentInfo: AgentInfo) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Ingest new data into Elasticsearch from scratch: ${agentInfo.email}`
    );

    this.logger.verbose?.('Starting search ingest from scratch');

    const task = await this.taskService.create();

    this.searchIngestService
      .removeIndices()
      .then(res => {
        if (!res.acknowledged) {
          throw new Error(
            res.message ? res.message : 'Failed to delete indices'
          );
        }
        this.taskService.updateTaskResults(task.id, 'Indices removed');
        return this.searchIngestService.ensureIndicesExist();
      })
      .then(res => {
        if (!res.acknowledged) {
          throw new Error(
            res.message ? res.message : 'Failed to create indices'
          );
        }
        this.taskService.updateTaskResults(task.id, 'Indices recreated');
        return this.searchIngestService.ingest(task);
      })
      .then(() => {
        this.taskService.complete(task.id);
        this.logger.verbose?.(
          'Search ingest from scratch completed',
          LogContext.SEARCH_INGEST
        );
      })
      .catch(async e => {
        await this.taskService.updateTaskErrors(task.id, e?.message);
        this.logger.error?.(
          `Search ingest from scratch completed with error: ${e?.message}`,
          e?.stack,
          LogContext.SEARCH_INGEST
        );
        return this.taskService.complete(task.id, TaskStatus.ERRORED);
      });

    return task.id;
  }
}
