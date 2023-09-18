import Ajv from 'ajv';
import { ErrorObject } from 'ajv/dist/types';
import * as schema from './excalidraw.schema.simple.json';

const ajv = new Ajv({ allErrors: true, strict: 'log' });

export const validateExcalidrawContent = (
  content: string
): Error | ErrorObject[] | undefined => {
  let json;

  try {
    json = JSON.parse(content);
  } catch (e: unknown) {
    return e as Error;
  }

  const validate = ajv.compile(schema);
  const valid = validate(json);

  if (valid) {
    return undefined;
  }

  return validate.errors ?? [];
};
