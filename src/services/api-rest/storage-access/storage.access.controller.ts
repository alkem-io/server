import {
  Controller,
  Get,
  Inject,
  LoggerService,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { RestGuard } from '@core/authorization/rest.guard';
import { DocumentService } from '@domain/storage/document/document.service';
import { AuthorizationService } from '@core/authorization/authorization.service';

@Controller('/rest/storage')
export class StorageAccessController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly documentService: DocumentService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @UseGuards(RestGuard)
  @Get('/')
  async storage(@CurrentUser() agentInfo: AgentInfo) {
    this.logger.verbose?.(
      `retrieved the current agent info: ${JSON.stringify(agentInfo)}`,
      LogContext.STORAGE_ACCESS
    );

    return 'hello storage';
  }

  @UseGuards(RestGuard)
  @Get('document/:id')
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Param('id') id: string
  ): Promise<AsyncIterable<Uint8Array>> {
    const document = await this.documentService.getDocumentOrFail(id);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ,
      `Read document: ${document.displayName}`
    );

    const contents = await this.documentService.getDocumentContents(document);
    this.logger.verbose?.(
      `Contents: ${JSON.stringify(contents)}`,
      LogContext.STORAGE_ACCESS
    );
    return contents;
  }
}
