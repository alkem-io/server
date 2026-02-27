import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { DataLoaderCreatorBaseOptions } from '@core/dataloader/creators/base/data.loader.creator.base.options';
import { sorOutputByKeys } from '@core/dataloader/utils/sort.output.by.keys';
import DataLoader from 'dataloader';
import { ILoader } from '../loader.interface';

export const createBatchLoader = <TResult extends { id: string }>(
  /**
   * The batch function that loads the data for the given keys.
   * It may return an empty array if nothing was found.
   * It may return an incomplete array if not all keys were found.
   * The incompleteness will be handled on a later stage while the result is verified.
   */
  batchLoadFn: (keys: ReadonlyArray<string>) => Promise<TResult[]>,
  options: {
    name: string; // for debugging purposes
    loadedTypeName: string; // for debugging purposes
  } & Pick<DataLoaderCreatorBaseOptions<any, any>, 'resolveToNull'>
): ILoader<
  | TResult
  | null
  | EntityNotFoundException
  | ForbiddenAuthorizationPolicyException
> => {
  // the data loader returns an array the MUST match the input length AND input key order
  // the provided batch function does not necessarily complete this requirement
  // so we create a wrapper function that executes the batch function and ensure the output length and order
  // by either returning the original output (if the length matches) or filling the missing values with errors or nulls, as per configuration.
  const loadAndEnsureOutputLengthAndOrder = async (
    keys: readonly string[]
  ): Promise<(TResult | null | Error)[]> => {
    const unsortedOutput = await batchLoadFn(keys);
    if (unsortedOutput.length == keys.length) {
      // length is ensured and sorted
      return sorOutputByKeys(unsortedOutput, keys);
    }
    // maps each returned result to its id for O(1) search
    const resultsById = new Map<string, TResult>(
      unsortedOutput.map<[string, TResult]>(result => [result.id, result])
    );
    // ensure the result length matches the input length and order
    return keys.map(
      key => resultsById.get(key) ?? resolveUnresolvedForKey(key)
    );
  };
  const { name, loadedTypeName, resolveToNull } = options;
  // a function to resolve an unresolved entity for a given key (e.g. if not found, etc.)
  const resolveUnresolvedForKey = (key: string) => {
    return resolveToNull
      ? null
      : new EntityNotFoundException(
          `Could not find ${loadedTypeName} for the given key`,
          LogContext.DATA_LOADER,
          { id: key }
        );
  };

  return new DataLoader<
    string,
    | TResult
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  >(keys => loadAndEnsureOutputLengthAndOrder(keys), {
    cache: true,
    name,
  });
};
