import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

export const VERTEX_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || 'investigator-435311';
export const VERTEX_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';

export const GEN_AI_CLIENT = new GoogleGenAI({
  vertexai: true,
  project: VERTEX_PROJECT,
  location: VERTEX_LOCATION,
});

export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];
