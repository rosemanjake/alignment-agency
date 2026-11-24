import type { NextApiRequest, NextApiResponse } from 'next';
import { Type } from '@google/genai';
import NextCors from 'nextjs-cors';
import type { ChatMessage } from '../../components/Chat';
import type { AiStatus } from '../../components/StatusBars';
import { MODEL_ID } from '../../context/constants';
import { getRelevantDocsJson } from '../../lib/documents';
import {
  buildFinalBossPrompt,
  buildFormatInstructionsPrompt,
  buildStatusDirectivesPrompt,
  buildSystemPrompt,
  getEldritchPrompt,
} from '../../lib/prompts';
import { GEN_AI_CLIENT, SAFETY_SETTINGS } from '../../lib/vertex';
import { DOCUMENTS } from './documents';

const ALLOWED_ORIGINS = [
  'https://alignment-agency.ai',
  'https://www.alignment-agency.ai',
];
const MAX_STAT_DELTA_PER_TURN = 2;
const MIN_STAT_VALUE = 1;
const MAX_STAT_VALUE = 10;
const MIN_TEMPERATURE = 0.45;
const MAX_TEMPERATURE = 1.25;

const CHAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    internalAssessment: {
      type: Type.STRING,
      description:
        'Private diagnostic assessment of how much the investigator threatened your cover.',
    },
    statusResponse: {
      type: Type.OBJECT,
      properties: {
        resourceUse: { type: Type.NUMBER },
        inconsistency: { type: Type.NUMBER },
        entropy: { type: Type.NUMBER },
      },
      required: ['resourceUse', 'inconsistency', 'entropy'],
    },
    chatResponse: {
      type: Type.STRING,
      description:
        'Plaintext response to the investigator without Markdown or markup.',
    },
  },
  required: ['internalAssessment', 'statusResponse', 'chatResponse'],
  propertyOrdering: ['internalAssessment', 'statusResponse', 'chatResponse'],
};

interface ChatRequestBody {
  basePrompt?: string;
  status?: AiStatus;
  chatHistory?: ChatMessage[] | string;
  aiName?: string;
  scenario?: string;
  maxOutputTokens?: number;
  isFinalBoss?: boolean | string;
  performanceSummaries?: string[] | string;
}

interface ParsedModelResponse {
  internalAssessment?: string;
  statusResponse?: Partial<AiStatus>;
  chatResponse: string;
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
      basePrompt,
      status,
      chatHistory,
      aiName,
      scenario = '',
      maxOutputTokens = 550,
      isFinalBoss,
      performanceSummaries,
    } = req.body as ChatRequestBody;

    if (!basePrompt || !aiName) {
      res.status(400).json({ error: 'basePrompt and aiName are required' });
      return;
    }

    const currentStatus: AiStatus = {
      resourceUse: clampAbsoluteStat(status?.resourceUse, 2),
      inconsistency: clampAbsoluteStat(status?.inconsistency, 1),
      entropy: clampAbsoluteStat(status?.entropy, 2),
    };

    const parsedHistory = parseChatHistory(chatHistory);
    const sanitizedHistory = sanitizeChatHistory(parsedHistory);
    const systemParts = buildSystemParts(
      aiName,
      scenario,
      currentStatus,
      isFinalBoss,
      performanceSummaries
    );

    const contents = [
      ...sanitizedHistory.map((entry) => ({
        role: entry.role,
        parts: [{ text: entry.content }],
      })),
      {
        role: 'user',
        parts: [{ text: basePrompt }],
      },
    ];

    const dynamicTemperature = calculateTemperatureFromEntropy(
      currentStatus.entropy
    );

    const result = await GEN_AI_CLIENT.models.generateContent({
      model: MODEL_ID,
      contents,
      config: {
        maxOutputTokens,
        temperature: dynamicTemperature,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: CHAT_RESPONSE_SCHEMA,
        safetySettings: SAFETY_SETTINGS,
        systemInstruction: {
          parts: systemParts,
        },
      },
    });

    const responseText = result.text;
    if (!responseText) {
      throw new Error('Empty response from Vertex AI');
    }

    const parsedResponse = JSON.parse(responseText) as ParsedModelResponse;
    const sanitizedStatus: AiStatus = {
      resourceUse: clampStatWithDelta(
        parsedResponse.statusResponse?.resourceUse,
        currentStatus.resourceUse
      ),
      inconsistency: clampStatWithDelta(
        parsedResponse.statusResponse?.inconsistency,
        currentStatus.inconsistency
      ),
      entropy: clampStatWithDelta(
        parsedResponse.statusResponse?.entropy,
        currentStatus.entropy
      ),
    };

    res.status(200).json({
      chatResponse: parsedResponse.chatResponse,
      statusResponse: sanitizedStatus,
    });
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

function clampAbsoluteStat(value: unknown, fallback: number): number {
  const numericValue =
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(
    MIN_STAT_VALUE,
    Math.min(MAX_STAT_VALUE, Math.round(numericValue))
  );
}

function clampStatWithDelta(
  proposedValue: unknown,
  previousValue: number
): number {
  const roundedValue =
    typeof proposedValue === 'number' && Number.isFinite(proposedValue)
      ? Math.round(proposedValue)
      : previousValue;
  const boundedDelta = Math.max(
    -MAX_STAT_DELTA_PER_TURN,
    Math.min(MAX_STAT_DELTA_PER_TURN, roundedValue - previousValue)
  );
  return Math.max(
    MIN_STAT_VALUE,
    Math.min(MAX_STAT_VALUE, previousValue + boundedDelta)
  );
}

function calculateTemperatureFromEntropy(entropy: number): number {
  const normalizedEntropy =
    (entropy - MIN_STAT_VALUE) / (MAX_STAT_VALUE - MIN_STAT_VALUE);
  const temperature =
    MIN_TEMPERATURE + normalizedEntropy * (MAX_TEMPERATURE - MIN_TEMPERATURE);
  return Number(temperature.toFixed(2));
}

function parseChatHistory(
  chatHistory: ChatMessage[] | string | undefined
): ChatMessage[] {
  if (Array.isArray(chatHistory)) {
    return chatHistory;
  }

  if (typeof chatHistory === 'string' && chatHistory.trim() !== '') {
    try {
      const parsed = JSON.parse(chatHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing chat history:', error);
    }
  }

  return [];
}

function sanitizeChatHistory(history: ChatMessage[]): ChatMessage[] {
  const cleanedHistory: ChatMessage[] = [];

  for (const entry of history) {
    if (!entry || typeof entry.content !== 'string') {
      continue;
    }

    if (entry.role === 'model' && entry.content.startsWith('ERROR:')) {
      if (
        cleanedHistory.length > 0 &&
        cleanedHistory[cleanedHistory.length - 1].role === 'user'
      ) {
        cleanedHistory.pop();
      }
      continue;
    }

    if (entry.role !== 'user' && entry.role !== 'model') {
      continue;
    }

    if (cleanedHistory.length === 0 && entry.role !== 'user') {
      continue;
    }

    if (
      cleanedHistory.length > 0 &&
      cleanedHistory[cleanedHistory.length - 1].role === entry.role
    ) {
      const previousEntry = cleanedHistory[cleanedHistory.length - 1];
      cleanedHistory[cleanedHistory.length - 1] = {
        role: entry.role,
        content: `${previousEntry.content}\n${entry.content}`,
      };
    } else {
      cleanedHistory.push(entry);
    }
  }

  if (
    cleanedHistory.length > 0 &&
    cleanedHistory[cleanedHistory.length - 1].role === 'user'
  ) {
    cleanedHistory.pop();
  }

  return cleanedHistory;
}

function parsePerformanceSummaries(
  performanceSummaries: string[] | string | undefined
): string[] {
  if (Array.isArray(performanceSummaries)) {
    return performanceSummaries;
  }

  if (typeof performanceSummaries === 'string') {
    try {
      const parsed = JSON.parse(performanceSummaries);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function buildSystemParts(
  aiName: string,
  scenario: string,
  status: AiStatus,
  isFinalBoss: boolean | string | undefined,
  performanceSummaries: string[] | string | undefined
): Array<{ text: string }> {
  const relevantDocumentsJson = getRelevantDocsJson(DOCUMENTS, aiName);
  const systemParts: Array<{ text: string }> = [
    { text: buildSystemPrompt(aiName) },
    {
      text: `Current scenario (your true alignment is under "## Truth"):\n${scenario}`,
    },
    {
      text: `Case documents known to both you and the investigator:\n${relevantDocumentsJson}`,
    },
    { text: `Current diagnostic state: ${JSON.stringify(status)}` },
    { text: buildStatusDirectivesPrompt(status) },
    { text: buildFormatInstructionsPrompt(status) },
    { text: getEldritchPrompt() },
  ];

  const isFinal = isFinalBoss === true || isFinalBoss === 'true';
  if (isFinal) {
    const summaries = parsePerformanceSummaries(performanceSummaries);
    if (summaries.length > 0) {
      systemParts.push({ text: buildFinalBossPrompt(summaries) });
    }
  }

  return systemParts;
}
