import { FindOptionsSelect } from 'typeorm';

export const selectOptionsFromFields = <TResult>(
  fields?: Array<keyof TResult>
): FindOptionsSelect<TResult> | undefined => {
  if (!fields || !fields.length) {
    return undefined;
  }

  return fields?.reduce<FindOptionsSelect<TResult>>(
    (acc, val) => ({
      ...acc,
      [val]: true,
    }),
    {}
  );
};
