import DataLoader from 'dataloader';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ILoader } from '../loader.interface';

export const createBatchLoader = <TResult extends { id: string }>(
  name: string, // for debugging purposes
  loadedTypeName: string, // for debugging purposes
  batchLoadFn: (keys: ReadonlyArray<string>) => Promise<TResult[]>
): ILoader<TResult> => {
  // the data loader returns an array the MUST match the input length
  // the provided batch function does not necessarily complete this requirement
  // so we create a wrapper function that executes the batch function and ensure the output length
  // by either returning the original output (if the length matches) or filling the missing values with errors
  const loadAndEnsureOutputLength = async (keys: readonly string[]) => {
    const output = await batchLoadFn(keys);
    if (output.length == keys.length) {
      // length is ensured
      return output;
    }
    // maps each returned result to its id
    const resultsById = new Map<string, TResult>(
      output.map<[string, TResult]>(result => [result.id, result])
    );
    // ensure the result length matches the input length
    return keys.map(
      key => resultsById.get(key) ?? resolveUnresolvedForKey(key)
    );
  };
  // a function to resolve an unresolved entity for a given key (e.g. if not found, etc.)
  const resolveUnresolvedForKey = (key: string) => {
    return new EntityNotFoundException(
      `Could not find ${loadedTypeName} for the given key`,
      LogContext.DATA_LOADER,
      { id: key }
    );
  };

  return new DataLoader<string, TResult>(
    keys => loadAndEnsureOutputLength(keys),
    {
      cache: true,
      name,
    }
  );
};
