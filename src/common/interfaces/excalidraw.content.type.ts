export type ExcalidrawContent = {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Record<string, string | number>;
  files?: Record<string, ExcalidrawFile>;
};

export type ExcalidrawFile = {
  mimeType: string;
  id: string;
  dataURL: string;
  created: number; // timestamp
  url?: string; // field extended by us; url pointing to the storage api
};

type ExalidrawElementType =
  | 'rectangle'
  | 'image'
  | 'text'
  | 'arrow'
  | 'line'
  | 'ellipse'
  | 'diamond'
  | 'freedraw';

export type ExcalidrawElement = { type: ExalidrawElementType } & (
  | ExcalidrawImageElement
  | {
      [key: string]: string | number | Array<unknown>;
    }
);

export type ExcalidrawImageElement = {
  type: 'image';
  fileId: string | null;
};

export type ExcalidrawTextElement = {
  type: 'text';
  originalText: string;
};

export const isExcalidrawTextElement = (
  element: ExcalidrawElement
): element is ExcalidrawTextElement =>
  (element as ExcalidrawTextElement)?.type === 'text';
