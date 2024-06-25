import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation, ObjectType, Field } from '@nestjs/graphql';
import { VirtualContributorService } from './virtual.contributor.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, ConfigurationTypes } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IVirtualContributor } from './virtual.contributor.interface';
import {
  DeleteVirtualContributorInput,
  UpdateVirtualContributorInput,
} from './dto';
import { ChromaClient } from 'chromadb';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Space } from '@domain/space/space/space.entity';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { SpaceIngestionPurpose } from '@services/infrastructure/event-bus/commands';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@ObjectType('MigrateEmbeddings')
class IMigrateEmbeddingsResponse {
  @Field(() => Boolean, { description: 'Result from the mutation execution.' })
  success!: boolean;
}

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverMutations {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private aiServerAdapter: AiServerAdapter,
    private config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMigrateEmbeddingsResponse, {
    description: 'Deletes collections nameID-...',
  })
  @Profiling.api
  async cleanupCollections(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMigrateEmbeddingsResponse> {
    const platformAuthorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformAuthorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'User not authenticated to migrate embeddings'
    );

    const vectorDb = this.config.get(ConfigurationTypes.PLATFORM).vector_db;

    const chroma = new ChromaClient({
      path: `http://${vectorDb.host}:${vectorDb.port}`,
    });

    // get all collections
    const collections = await chroma.listCollections();
    for (const collection of collections) {
      // extract collection identifier and purpose
      const [, nameID, purpose] =
        collection.name.match(/(.*)-(knowledge|context)/) || [];

      // if the identifier is of UUID format, skip it
      if (
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(
          nameID
        )
      ) {
        continue;
      }

      // get the space by nameID
      const space = await this.entityManager.findOne(Space, {
        where: { nameID: nameID },
      });

      // if the space doesn't exit skip the colletion
      if (!space) {
        this.logger.warn(
          `Space with nameID ${nameID} does't exist but ${collection.name} is still in Chroma`
        );
        continue;
      }

      // check if there is UUID identified collection for this space
      const uuidCollection = await chroma.getCollection({
        name: `${space.id}-${purpose}`,
      });

      // if so, delete the nameID one
      if (uuidCollection) {
        await chroma.deleteCollection(collection);
      }
    }

    return { success: true };
  }
  @UseGuards(GraphqlGuard)
  @Mutation(() => IMigrateEmbeddingsResponse, {
    description: 'Copies collections nameID-... into UUID-...',
  })
  @Profiling.api
  async renameCollections(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMigrateEmbeddingsResponse> {
    const platformAuthorization =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformAuthorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'User not authenticated to migrate embeddings'
    );

    const vectorDb = this.config.get(ConfigurationTypes.PLATFORM).vector_db;

    const chroma = new ChromaClient({
      path: `http://${vectorDb.host}:${vectorDb.port}`,
    });
    // get all chroma collections
    const collections = await chroma.listCollections();

    for (const collection of collections) {
      // extract collection identifier and purpose
      const [, nameID, purpose] =
        collection.name.match(/(.*)-(knowledge|context)/) || [];

      // if the identifier is of UUID format, skip it
      if (
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(
          nameID
        )
      ) {
        continue;
      }
      // get the space by nameID
      const space = await this.entityManager.findOne(Space, {
        where: { nameID: nameID },
      });

      // if the space doesn't exit skip the colletion
      if (!space) {
        this.logger.warn(
          `Space with nameID ${nameID} does't exist but ${collection.name} is still in Chroma`
        );
        continue;
      }

      // ask the AI server to ingest the space again;
      // the ingest space service uses the UUID as collection identifier now
      this.aiServerAdapter.ensureSpaceIsUsable(
        space.id,
        purpose as SpaceIngestionPurpose
      );
    }

    return { success: true };
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Updates the specified VirtualContributor.',
  })
  @Profiling.api
  async updateVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorData')
    virtualContributorData: UpdateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        virtualContributorData.ID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${virtual.nameID}`
    );

    return await this.virtualContributorService.updateVirtualContributor(
      virtualContributorData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Deletes the specified VirtualContributor.',
  })
  async deleteVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        deleteData.ID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${virtual.nameID}`
    );
    return await this.virtualContributorService.deleteVirtualContributor(
      deleteData.ID
    );
  }
}
