export enum ErrorCode {
  VECTOR_INSERT = 'vector_insert',
}

export type IngestError = {
  code?: ErrorCode;
  message: string;
};
