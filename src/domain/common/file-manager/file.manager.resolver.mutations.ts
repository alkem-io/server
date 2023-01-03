import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { DeleteFileInput } from './file.manager.dto.delete';
import { FileManagerService } from './file.manager.service';

@Resolver()
export class FileManagerResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private fileManagerService: FileManagerService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Uploads a file.',
  })
  public async uploadFile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<string> {
    const authorizationPolicy =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.FILE_UPLOAD,
      `file upload: ${filename}`
    );
    const readStream = createReadStream();
    return this.fileManagerService.uploadFile(readStream, filename, mimetype);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Removes a file.',
  })
  public async deleteFile(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'deleteData',
    })
    deleteData: DeleteFileInput
  ): Promise<boolean> {
    const authorizationPolicy =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.FILE_DELETE,
      `file delete: ${deleteData.CID}`
    );

    return this.fileManagerService.removeFile(deleteData.CID);
  }
}
