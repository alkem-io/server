import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { IContext, Context, CreateContextInput } from '@domain/context/context';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { EcosystemModelService } from '@domain/context/ecosystem-model/ecosystem-model.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateContextInput } from './dto/context.dto.update';

@Injectable()
export class ContextService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private ecosystemModelService: EcosystemModelService,
    private referenceService: ReferenceService,
    @InjectRepository(Context)
    private contextRepository: Repository<Context>
  ) {}

  async createContext(contextData: CreateContextInput): Promise<IContext> {
    const context: IContext = Context.create({ ...contextData });

    context.ecosystemModel =
      await this.ecosystemModelService.createEcosystemModel({});
    context.authorization = new AuthorizationPolicy();

    return await this.contextRepository.save(context);
  }

  async getContextOrFail(
    contextID: string,
    options?: FindOneOptions<Context>
  ): Promise<IContext | never> {
    const context = await this.contextRepository.findOne({
      where: { id: contextID },
      ...options,
    });
    if (!context)
      throw new EntityNotFoundException(
        `No Context found with the given id: ${contextID}`,
        LogContext.CONTEXT
      );
    return context;
  }

  async updateContext(
    contextInput: IContext,
    contextUpdateData: UpdateContextInput
  ): Promise<IContext> {
    const context = await this.getContextOrFail(contextInput.id);
    if (contextUpdateData.vision) {
      context.vision = contextUpdateData.vision;
    }
    if (contextUpdateData.impact) {
      context.impact = contextUpdateData.impact;
    }
    if (contextUpdateData.who) {
      context.who = contextUpdateData.who;
    }

    return await this.contextRepository.save(context);
  }

  async removeContext(contextID: string): Promise<IContext> {
    // Note need to load it in with all contained entities so can remove fully
    const context = await this.getContextOrFail(contextID, {
      relations: {
        ecosystemModel: {
          actorGroups: true,
        },
      },
    });

    if (context.ecosystemModel) {
      await this.ecosystemModelService.deleteEcosystemModel(
        context.ecosystemModel.id
      );
    }

    if (context.authorization)
      await this.authorizationPolicyService.delete(context.authorization);

    return await this.contextRepository.remove(context as Context);
  }

  async getEcosystemModel(context: IContext): Promise<IEcosystemModel> {
    const contextLoaded = await this.getContextOrFail(context.id, {
      relations: {
        ecosystemModel: {
          actorGroups: true,
        },
      },
    });
    if (!contextLoaded.ecosystemModel)
      throw new EntityNotFoundException(
        `Context not initialised: ${context.id}`,
        LogContext.CONTEXT
      );

    return contextLoaded.ecosystemModel;
  }
}
