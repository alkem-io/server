import {
  Controller,
  Get,
  Inject,
  LoggerService,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Response } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';
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
  @Get('document/:id')
  async document(
    @CurrentUser() agentInfo: AgentInfo,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const document = await this.documentService.getDocumentOrFail(id);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      document.authorization,
      AuthorizationPrivilege.READ,
      `Read document: ${document.displayName}`
    );

    res.setHeader('Content-Type', `${document.mimeType}`);

    const readable = this.documentService.getDocumentContents(document);
    return new StreamableFile(readable);
  }
}
