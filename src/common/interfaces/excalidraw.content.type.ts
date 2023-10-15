export type ExcalidrawContent = {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: Record<string, string | number | Array<unknown>>[];
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
