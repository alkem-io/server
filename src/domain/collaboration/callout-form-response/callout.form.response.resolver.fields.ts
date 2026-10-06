import { UserLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ICalloutFormResponse } from './callout.form.response.interface';

@Resolver(() => ICalloutFormResponse)
export class CalloutFormResponseResolverFields {
  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description:
      'The member who submitted the response. Null once that account has been deleted.',
  })
  async createdBy(
    @Parent() response: ICalloutFormResponse,
    @Loader(UserLoaderCreator, { resolveToNull: true })
    loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    if (!response.createdBy) {
      return null;
    }
    return loader.load(response.createdBy);
  }
}
