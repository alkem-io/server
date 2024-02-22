import Ajv from 'ajv';
import { ErrorObject } from 'ajv/dist/types';
import * as schema from './machine.schema.simple.json';

const ajv = new Ajv({ allErrors: true, strict: 'log' });

export const validateMachineDefinition = (
  definition: string
): Error | ErrorObject[] | undefined => {
  let json;
  let validate;

  try {
    json = JSON.parse(definition);
  } catch (e: unknown) {
    return e as Error;
  }

  try {
    validate = ajv.compile(schema);
  } catch (e: unknown) {
    return e as Error;
  }

  const valid = validate(json);

  if (valid) {
    return undefined;
  }

  return validate.errors ?? [];
};
