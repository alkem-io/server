import type {
  SemanticBatchResult,
  SemanticOperation,
} from '@excalidraw-yjs/excalidraw/headless';
import Ajv from 'ajv';

export type ExecutorOutcome =
  | 'invalid'
  | 'unavailable'
  | 'unauthorized'
  | 'forbidden'
  | 'busy'
  | 'cancelled-before-go'
  | 'resource-exhausted-before-go'
  | 'timeout-before-go'
  | 'indeterminate-after-go'
  | 'durable-success';
export type ExecutorResult = Pick<
  Extract<SemanticBatchResult, { ok: true }>,
  'addedElementIds' | 'summary'
>;
export interface ChildLaunchGrant {
  jobId: string;
  documentId: string;
  actorId: string;
  deadline: number;
  intent: 'edit-whiteboard-elements';
}
export type ParentMessage =
  | {
      type: 'START';
      operations: SemanticOperation[];
      childLaunchGrant: ChildLaunchGrant;
    }
  | { type: 'GO' | 'CANCEL'; jobId: string; generationId: number };
export type ChildMessage =
  | { type: 'SYNCED' | 'PUBLISHED'; jobId: string; generationId: number }
  | {
      type: 'PREPARED';
      jobId: string;
      generationId: number;
      updateDigest: string;
      byteLength: number;
      summary: ExecutorResult['summary'];
    }
  | {
      type: 'DURABLE';
      jobId: string;
      generationId: number;
      result: ExecutorResult;
    }
  | {
      type: 'FAILED';
      jobId?: string;
      generationId?: number;
      typedOutcome: ExecutorOutcome;
    };

const string = { type: 'string' };
const number = { type: 'number' };
const uuid = {
  type: 'string',
  pattern:
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
};
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties)
) => ({ type: 'object', properties, required, additionalProperties: false });
const placement = { x: number, y: number, width: number, height: number };
const operation = (
  op: string,
  properties: Record<string, unknown>,
  required: string[]
) => object({ op: { const: op }, ...properties }, ['op', ...required]);
export const operationsSchema = {
  type: 'array',
  minItems: 1,
  items: {
    oneOf: [
      operation(
        'addShape',
        {
          shape: { enum: ['rectangle', 'ellipse', 'diamond'] },
          label: string,
          fillColor: string,
          strokeColor: string,
          ...placement,
        },
        ['shape']
      ),
      operation(
        'addText',
        {
          text: string,
          fontSize: number,
          strokeColor: string,
          x: number,
          y: number,
          width: number,
        },
        ['text']
      ),
      operation(
        'connect',
        { fromId: string, toId: string, arrowLabel: string },
        ['fromId', 'toId']
      ),
      operation('setText', { elementId: string, text: string }, [
        'elementId',
        'text',
      ]),
      operation('remove', { elementId: string }, ['elementId']),
    ],
  },
};
const identity = { jobId: uuid, generationId: { type: 'integer', minimum: 1 } };
const summary = {
  type: 'array',
  items: object({
    op: { enum: ['addShape', 'addText', 'connect', 'setText', 'remove'] },
    elementIds: { type: 'array', items: string },
  }),
};
const result = object({
  addedElementIds: { type: 'array', items: string },
  summary,
});
const ajv = new Ajv({ strict: false });
const parentValidator = ajv.compile({
  oneOf: [
    object({
      type: { const: 'START' },
      operations: operationsSchema,
      childLaunchGrant: object({
        jobId: uuid,
        documentId: uuid,
        actorId: uuid,
        deadline: { type: 'integer', minimum: 1 },
        intent: { const: 'edit-whiteboard-elements' },
      }),
    }),
    object({ type: { enum: ['GO', 'CANCEL'] }, ...identity }),
  ],
});
const childValidator = ajv.compile({
  oneOf: [
    object({ type: { enum: ['SYNCED', 'PUBLISHED'] }, ...identity }),
    object({
      type: { const: 'PREPARED' },
      ...identity,
      updateDigest: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      byteLength: { type: 'integer', minimum: 0 },
      summary,
    }),
    object({ type: { const: 'DURABLE' }, ...identity, result }),
    object(
      {
        type: { const: 'FAILED' },
        ...identity,
        typedOutcome: {
          enum: [
            'invalid',
            'unauthorized',
            'forbidden',
            'busy',
            'cancelled-before-go',
            'resource-exhausted-before-go',
            'timeout-before-go',
            'indeterminate-after-go',
          ],
        },
      },
      ['type', 'typedOutcome']
    ),
  ],
});
const batchValidator = ajv.compile(operationsSchema);
export const validOperations = (value: unknown): value is SemanticOperation[] =>
  !!batchValidator(value);
export const validId = (value: unknown): value is string =>
  typeof value === 'string' && new RegExp(uuid.pattern).test(value);
export const parseParentMessage = (
  value: unknown
): { success: boolean; data?: ParentMessage } =>
  parentValidator(value)
    ? { success: true, data: value as ParentMessage }
    : { success: false };
export const parseChildMessage = (
  value: unknown
): { success: boolean; data?: ChildMessage } =>
  childValidator(value)
    ? { success: true, data: value as ChildMessage }
    : { success: false };
