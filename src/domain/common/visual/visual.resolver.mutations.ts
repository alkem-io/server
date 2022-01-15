import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AgentInfo } from '@core/authentication';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { VisualUploadImageInput } from './dto/visual.dto.upload.image';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { VisualService } from './visual.service';
import { IVisual } from './visual.interface';

@Resolver()
export class VisualResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private visualService: VisualService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVisual, {
    description: 'Uploads and sets an image for the specified Visual.',
  })
  async uploadImageOnVisual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('uploadData') uploadData: VisualUploadImageInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<IVisual> {
    const visual = await this.visualService.getVisualOrFail(
      uploadData.visualID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      visual.authorization,
      AuthorizationPrivilege.UPDATE,
      `visual image upload: ${visual.id}`
    );
    const readStream = createReadStream();
    const updatedProfile = await this.visualService.uploadAvatar(
      visual,
      readStream,
      filename,
      mimetype
    );

    return updatedProfile;
  }
}
