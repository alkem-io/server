import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args, Field, ObjectType } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IAiServer } from './ai.server.interface';
import { AiServerAuthorizationService } from './ai.server.service.authorization';
import { AiServerService } from './ai.server.service';
import { AiPersonaServiceService } from '../ai-persona-service/ai.persona.service.service';
import { AiPersonaServiceAuthorizationService } from '../ai-persona-service/ai.persona.service.authorization';
import { CreateAiPersonaServiceInput } from '../ai-persona-service/dto/ai.persona.service.dto.create';
import { IAiPersonaService } from '../ai-persona-service/ai.persona.service.interface';
import { ConfigurationTypes } from '@common/enums';
import { Space } from '@domain/space/space/space.entity';
import { ChromaClient } from 'chromadb';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { EntityManager } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@ObjectType('MigrateEmbeddings')
class IMigrateEmbeddingsResponse {
  @Field(() => Boolean, { description: 'Result from the mutation execution.' })
  success!: boolean;
}

@Resolver()
export class AiServerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private aiServerService: AiServerService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    private aiPersonaServiceService: AiPersonaServiceService,
    private aiPersonaServiceAuthorizationService: AiPersonaServiceAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
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
  @Mutation(() => IAiServer, {
    description: 'Reset the Authorization Policy on the specified AiServer.',
  })
  async aiServerAuthorizationPolicyReset(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IAiServer> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on aiServer: ${agentInfo.email}`
    );
    return await this.aiServerAuthorizationService.applyAuthorizationPolicy();
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAiPersonaService, {
    description: 'Creates a new AiPersonaService on the aiServer.',
  })
  async aiServerCreateAiPersonaService(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaServiceData')
    aiPersonaServiceData: CreateAiPersonaServiceInput
  ): Promise<IAiPersonaService> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `create Virtual persona: ${aiPersonaServiceData.engine}`
    );
    let aiPersonaService =
      await this.aiPersonaServiceService.createAiPersonaService(
        aiPersonaServiceData
      );

    aiPersonaService =
      await this.aiPersonaServiceAuthorizationService.applyAuthorizationPolicy(
        aiPersonaService,
        aiServer.authorization
      );

    aiPersonaService.aiServer = aiServer;

    await this.aiPersonaServiceService.save(aiPersonaService);

    return aiPersonaService;
  }
}
