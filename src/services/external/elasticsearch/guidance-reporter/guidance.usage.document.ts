export type GuidanceUsageDocument = {
  // todo jsdoc
  question: string;
  answer: string;
  sources: string[]; // todo
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  author: string;
  '@timestamp': Date;
  alkemio: boolean;
  environment: string;
};
