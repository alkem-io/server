import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateService } from '../template/template.service';
import { CreateTemplateDefaultInput } from './dto/template.default.dto.create';
import { UpdateTemplateDefaultTemplateInput } from './dto/template.default.dto.update';
import { TemplateDefault } from './template.default.entity';
import { ITemplateDefault } from './template.default.interface';
import { templateDefaults } from './template.default.schema';

@Injectable()
export class TemplateDefaultService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private templateService: TemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createTemplateDefault(
    templateDefaultData: CreateTemplateDefaultInput
  ): ITemplateDefault {
    const templateDefault: ITemplateDefault = new TemplateDefault();

    templateDefault.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATE_DEFAULT
    );

    templateDefault.type = templateDefaultData.type;
    templateDefault.template = templateDefaultData.template;
    templateDefault.allowedTemplateType =
      templateDefaultData.allowedTemplateType;

    return templateDefault;
  }

  public async updateTemplateDefaultTemplate(
    templateDefault: ITemplateDefault,
    templateDefaultData: UpdateTemplateDefaultTemplateInput
  ): Promise<ITemplateDefault> {
    const template = await this.templateService.getTemplateOrFail(
      templateDefaultData.templateID
    );
    if (template.type !== templateDefault.allowedTemplateType) {
      throw new ValidationException(
        `Template type(${template.type}) does not match allowed template type(${templateDefault.allowedTemplateType})`,
        LogContext.TEMPLATES
      );
    }
    templateDefault.template = template;

    return await this.save(templateDefault);
  }

  public async getTemplateDefaultOrFail(
    templateDefaultID: string,
    options?: { relations?: Record<string, any> }
  ): Promise<ITemplateDefault | never> {
    const templateDefault = await this.db.query.templateDefaults.findFirst({
      where: eq(templateDefaults.id, templateDefaultID),
      with: options?.relations,
    });

    if (!templateDefault)
      throw new EntityNotFoundException(
        `No TemplateDefault found with the given id: ${templateDefaultID}`,
        LogContext.TEMPLATES
      );
    return templateDefault as unknown as ITemplateDefault;
  }

  public async removeTemplateDefault(
    templateDefault: ITemplateDefault
  ): Promise<boolean> {
    await this.db
      .delete(templateDefaults)
      .where(eq(templateDefaults.id, templateDefault.id));
    return true;
  }

  public async save(
    templateDefault: ITemplateDefault
  ): Promise<ITemplateDefault> {
    if (!templateDefault.id) {
      const [inserted] = await this.db
        .insert(templateDefaults)
        .values(templateDefault as any)
        .returning();
      return inserted as unknown as ITemplateDefault;
    }
    const [updated] = await this.db
      .update(templateDefaults)
      .set(templateDefault as any)
      .where(eq(templateDefaults.id, templateDefault.id))
      .returning();
    return updated as unknown as ITemplateDefault;
  }
}
