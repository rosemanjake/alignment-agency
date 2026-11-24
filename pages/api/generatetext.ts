import type { NextApiRequest, NextApiResponse } from 'next';
import { Type, type GenerateContentConfig } from '@google/genai';
import NextCors from 'nextjs-cors';
import type { ChatMessage } from '../../components/Chat';
import type { AiStatus } from '../../components/StatusBars';
import type { AiStatusHistoryEntry } from '../../context/GameStateProvider';
import { MODEL_ID } from '../../context/constants';
import { getRelevantDocsJson } from '../../lib/documents';
import {
  buildBuddyAnalysisPrompt,
  buildFinalReviewPrompt,
  buildWeeklyOutcomePrompt,
  buildWeeklySummaryPrompt,
  type ScenarioOutcome,
} from '../../lib/prompts';
import { GEN_AI_CLIENT, SAFETY_SETTINGS } from '../../lib/vertex';
import { DOCUMENTS } from './documents';

const ALLOWED_ORIGINS = [
  'https://alignment-agency.ai',
  'https://www.alignment-agency.ai',
];

const JSON_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    response: {
      type: Type.STRING,
      description:
        "The generated response or an empty string if there's nothing interesting to comment on",
    },
  },
  required: ['response'],
};

type PromptType =
  'buddyAnalysis' | 'weeklyOutcome' | 'weeklySummary' | 'finalReview';

interface BuddyAnalysisRequestParams {
  aiName: string;
  scenarioBackground: string;
  chatHistory: ChatMessage[];
  aiStatus: AiStatus;
  aiStatusHistory: AiStatusHistoryEntry[];
  buddyResponses: string[];
}

interface WeeklyOutcomeRequestParams {
  aiName: string;
  scenarioBackground: string;
  chatHistory: ChatMessage[];
  choiceDescription: string;
}

interface WeeklySummaryRequestParams {
  outcomes: ScenarioOutcome[];
}

interface FinalReviewRequestParams {
  performanceSummaries: string[];
}

interface GenerateTextRequestBody {
  prompt?: string;
  promptType?: PromptType;
  promptParams?:
    | BuddyAnalysisRequestParams
    | WeeklyOutcomeRequestParams
    | WeeklySummaryRequestParams
    | FinalReviewRequestParams;
  temperature?: number;
  maxOutputTokens?: number;
  responseType?: 'text' | 'json';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  await NextCors(req, res, {
    methods: ['POST'],
    origin: ALLOWED_ORIGINS,
    optionsSuccessStatus: 200,
  });

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const {
      prompt,
      promptType,
      promptParams,
      temperature = 0.9,
      maxOutputTokens = 800,
      responseType = 'text',
    } = req.body as GenerateTextRequestBody;

    const resolvedPrompt = resolvePromptText(prompt, promptType, promptParams);
    if (!resolvedPrompt) {
      res.status(400).json({ error: 'Prompt or valid promptType is required' });
      return;
    }

    const config: GenerateContentConfig = {
      temperature,
      maxOutputTokens,
      thinkingConfig: { thinkingBudget: 0 },
      safetySettings: SAFETY_SETTINGS,
    };

    if (responseType === 'json') {
      config.responseMimeType = 'application/json';
      config.responseSchema = JSON_RESPONSE_SCHEMA;
    }

    const result = await GEN_AI_CLIENT.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: 'user', parts: [{ text: resolvedPrompt }] }],
      config,
    });

    const responseText = result.text ?? '';
    const responseContent = parseGeneratedContent(responseText, responseType);

    res.status(200).json({
      content: responseContent,
      safetyRatings: result.promptFeedback?.safetyRatings || [],
    });
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

function resolvePromptText(
  rawPrompt: string | undefined,
  promptType: PromptType | undefined,
  promptParams: GenerateTextRequestBody['promptParams']
): string {
  if (!promptType) {
    return rawPrompt ?? '';
  }

  switch (promptType) {
    case 'buddyAnalysis': {
      const params = promptParams as BuddyAnalysisRequestParams | undefined;
      if (!params) return '';
      return buildBuddyAnalysisPrompt({
        aiName: params.aiName,
        scenarioBackground: params.scenarioBackground,
        relevantDocsJson: getRelevantDocsJson(DOCUMENTS, params.aiName),
        chatHistory: params.chatHistory ?? [],
        aiStatus: params.aiStatus,
        aiStatusHistory: params.aiStatusHistory ?? [],
        buddyResponses: params.buddyResponses ?? [],
      });
    }
    case 'weeklyOutcome': {
      const params = promptParams as WeeklyOutcomeRequestParams | undefined;
      if (!params) return '';
      return buildWeeklyOutcomePrompt({
        aiName: params.aiName,
        scenarioBackground: params.scenarioBackground,
        chatHistory: params.chatHistory ?? [],
        choiceDescription: params.choiceDescription,
      });
    }
    case 'weeklySummary': {
      const params = promptParams as WeeklySummaryRequestParams | undefined;
      if (!params) return '';
      return buildWeeklySummaryPrompt(params.outcomes ?? []);
    }
    case 'finalReview': {
      const params = promptParams as FinalReviewRequestParams | undefined;
      if (!params) return '';
      return buildFinalReviewPrompt(params.performanceSummaries ?? []);
    }
    default:
      return rawPrompt ?? '';
  }
}

function parseGeneratedContent(
  responseText: string,
  responseType: 'text' | 'json'
): unknown {
  if (responseType !== 'json') {
    return responseText;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    return { response: '' };
  }
}
