import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { spaces } from '@domain/space/space/space.schema';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Field, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AlkemioConfig } from '@src/types';
import { ChromaClient } from 'chromadb';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  AiPersonaService,
  CreateAiPersonaInput,
  IAiPersona,
} from '../ai-persona';
import { AiPersonaAuthorizationService } from '../ai-persona/ai.persona.service.authorization';
import { IAiServer } from './ai.server.interface';
import { AiServerService } from './ai.server.service';
import { AiServerAuthorizationService } from './ai.server.service.authorization';

@ObjectType('MigrateEmbeddings')
class IMigrateEmbeddingsResponse {
  @Field(() => Boolean, { description: 'Result from the mutation execution.' })
  success!: boolean;
}

@InstrumentResolver()
@Resolver()
export class AiServerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private aiServerService: AiServerService,
    private aiServerAuthorizationService: AiServerAuthorizationService,
    private aiPersonaService: AiPersonaService,
    private aiPersonaAuthorizationService: AiPersonaAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private config: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService
  ) {}

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

    const { host, port, credentials } = this.config.get('platform.vector_db', {
      infer: true,
    });

    const chroma = new ChromaClient({
      path: `http://${host}:${port}`,
      auth: {
        provider: 'basic',
        credentials,
      },
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
      const space = await this.db.query.spaces.findFirst({
        where: eq(spaces.nameID, nameID),
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
      AuthorizationPrivilege.GRANT, // to be auth reset
      `reset authorization on aiServer: ${agentInfo.email}`
    );
    const authorizations =
      await this.aiServerAuthorizationService.applyAuthorizationPolicy();
    await this.authorizationPolicyService.saveAll(authorizations);
    return await this.aiServerService.getAiServerOrFail();
  }

  @Mutation(() => IAiPersona, {
    description: 'Creates a new AiPersona on the aiServer.',
  })
  async aiServerCreateAiPersona(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aiPersonaData')
    aiPersonaData: CreateAiPersonaInput
  ): Promise<IAiPersona> {
    const aiServer = await this.aiServerService.getAiServerOrFail();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiServer.authorization,
      AuthorizationPrivilege.CREATE,
      `create Virtual persona: ${aiPersonaData.engine}`
    );
    let aiPersona = await this.aiPersonaService.createAiPersona(
      aiPersonaData,
      aiServer
    );
    aiPersona.aiServer = aiServer;
    aiPersona = await this.aiPersonaService.save(aiPersona);

    const authorizations =
      await this.aiPersonaAuthorizationService.applyAuthorizationPolicy(
        aiPersona,
        aiServer.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);

    return this.aiPersonaService.getAiPersonaOrFail(aiPersona.id);
  }
}
