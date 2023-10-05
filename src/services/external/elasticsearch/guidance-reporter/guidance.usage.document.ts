export type GuidanceUsageDocument = {
  question: string;
  answer: string;
  sources: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  author: string;
  '@timestamp': Date;
  alkemio: boolean;
  environment: string;
};
