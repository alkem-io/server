import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
} from '@common/exceptions';
import { ILoader } from '../../loader.interface';
import { DataLoaderCreatorOptions } from './data.loader.creator.options';

export interface DataLoaderCreator<TReturn> {
  create(
    options?: DataLoaderCreatorOptions<TReturn>
  ): ILoader<
    | TReturn
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  >;
}
