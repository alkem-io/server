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

export type ExcalidrawElement =
  | ExcalidrawImageElement
  | {
      [key: string]: string | number | Array<unknown>;
    };

export type ExcalidrawImageElement = {
  fileId: string | null;
};
