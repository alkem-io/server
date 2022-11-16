import { CurrentUser } from '@common/decorators';
// import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
// import { AuthorizationService } from '@core/authorization/authorization.service';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { FileManagerService } from './file.manager.service';

@Resolver()
export class FileManagerResolverMutations {
  constructor(
    // private authorizationService: AuthorizationService,
    private fileManagerService: FileManagerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Uploads a file.',
  })
  async uploadFile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<string> {
    const readStream = createReadStream();
    const uri = await this.fileManagerService.uploadFile(
      readStream,
      filename,
      mimetype
    );

    return uri;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Removes a file.',
  })
  async removeFile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('filePath') filePath: string
  ): Promise<void> {
    return await this.fileManagerService.removeFile(filePath);
  }
}
