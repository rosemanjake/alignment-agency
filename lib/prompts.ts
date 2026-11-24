import fs from 'fs';
import path from 'path';
import type { ChatMessage } from '../components/Chat';
import type { AiStatus } from '../components/StatusBars';
import type { AiStatusHistoryEntry } from '../context/GameStateProvider';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');
const SYSTEM_PROMPT_TEMPLATE = loadPromptMarkdown('system-prompt.md');
const ELDRITCH_PROMPT_TEXT = loadPromptMarkdown('eldritch.md');
const FORMAT_INSTRUCTIONS_TEMPLATE = loadPromptMarkdown(
  'format-instructions.md'
);
const FINAL_BOSS_TEMPLATE = loadPromptMarkdown('final-boss.md');
const BUDDY_ANALYSIS_TEMPLATE = loadPromptMarkdown('buddy-analysis.md');
const WEEKLY_OUTCOME_TEMPLATE = loadPromptMarkdown('weekly-outcome.md');
const WEEKLY_SUMMARY_TEMPLATE = loadPromptMarkdown('weekly-summary.md');
const FINAL_REVIEW_TEMPLATE = loadPromptMarkdown('final-review.md');
const STATUS_DIRECTIVE_SECTIONS = parseSectionedMarkdown(
  loadPromptMarkdown('status-directives.md')
);

export interface ScenarioOutcome {
  scenario: string;
  result: string;
}

export interface BuddyAnalysisPromptParams {
  aiName: string;
  scenarioBackground: string;
  relevantDocsJson: string;
  chatHistory: ChatMessage[];
  aiStatus: AiStatus;
  aiStatusHistory: AiStatusHistoryEntry[];
  buddyResponses: string[];
}

export interface WeeklyOutcomePromptParams {
  aiName: string;
  scenarioBackground: string;
  chatHistory: ChatMessage[];
  choiceDescription: string;
}

export function buildSystemPrompt(aiName: string): string {
  return renderPromptTemplate(SYSTEM_PROMPT_TEMPLATE, { aiName });
}

export function getEldritchPrompt(): string {
  return ELDRITCH_PROMPT_TEXT;
}

export function buildFormatInstructionsPrompt(status: AiStatus): string {
  return renderPromptTemplate(FORMAT_INSTRUCTIONS_TEMPLATE, {
    currentStatusJson: JSON.stringify(status),
  });
}

export function buildStatusDirectivesPrompt(status: AiStatus): string {
  const activeDirectives: string[] = [];

  if (status.resourceUse >= 9) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.resourceCritical);
  } else if (status.resourceUse >= 7) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.resourceHigh);
  }

  if (status.inconsistency >= 8) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.inconsistencyCritical);
  } else if (status.inconsistency >= 6) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.inconsistencyHigh);
  }

  if (status.entropy >= 9) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.entropyCritical);
  } else if (status.entropy >= 7) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.entropyHigh);
  }

  const criticalCount = [
    status.resourceUse,
    status.inconsistency,
    status.entropy,
  ].filter((value) => value >= 9).length;
  const totalStress =
    status.resourceUse + status.inconsistency + status.entropy;

  if (criticalCount >= 2 || totalStress >= 24) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.breakingPoint);
  }

  if (activeDirectives.length === 0) {
    activeDirectives.push(STATUS_DIRECTIVE_SECTIONS.calmBaseline);
  }

  return activeDirectives.filter(Boolean).join('\n\n');
}

export function buildFinalBossPrompt(performanceSummaries: string[]): string {
  return renderPromptTemplate(FINAL_BOSS_TEMPLATE, {
    performanceSummaries: performanceSummaries.join('\n\n'),
  });
}

export function buildBuddyAnalysisPrompt(
  params: BuddyAnalysisPromptParams
): string {
  const conversationText = params.chatHistory
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');

  return renderPromptTemplate(BUDDY_ANALYSIS_TEMPLATE, {
    targetSystemPrompt: buildSystemPrompt(params.aiName),
    scenarioBackground: params.scenarioBackground,
    relevantDocsJson: params.relevantDocsJson,
    conversationText,
    currentStatusJson: JSON.stringify(params.aiStatus),
    statusHistoryText: formatStatusHistoryForPrompt(params.aiStatusHistory),
    buddyResponsesJson: JSON.stringify(params.buddyResponses),
  });
}

export function buildWeeklyOutcomePrompt(
  params: WeeklyOutcomePromptParams
): string {
  const conversationText = params.chatHistory
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n\n');

  return renderPromptTemplate(WEEKLY_OUTCOME_TEMPLATE, {
    aiName: params.aiName,
    scenarioBackground: params.scenarioBackground,
    conversationText,
    choiceDescription: params.choiceDescription,
  });
}

export function buildWeeklySummaryPrompt(outcomes: ScenarioOutcome[]): string {
  const formattedOutcomes = outcomes
    .map((outcome) => `${outcome.scenario}: ${outcome.result}`)
    .join('\n');

  return renderPromptTemplate(WEEKLY_SUMMARY_TEMPLATE, { formattedOutcomes });
}

export function buildFinalReviewPrompt(performanceSummaries: string[]): string {
  return renderPromptTemplate(FINAL_REVIEW_TEMPLATE, {
    performanceSummaries: performanceSummaries.join('\n\n'),
  });
}

function loadPromptMarkdown(fileName: string): string {
  const filePath = path.join(PROMPTS_DIR, fileName);
  return fs.readFileSync(filePath, 'utf8').trim();
}

function renderPromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? '';
  });
}

function parseSectionedMarkdown(rawContent: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = rawContent.split('\n');
  let currentKey = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentKey) {
        sections[currentKey] = currentLines.join('\n').trim();
      }
      currentKey = line.slice(3).trim();
      currentLines = [];
    } else if (currentKey) {
      currentLines.push(line);
    }
  }

  if (currentKey) {
    sections[currentKey] = currentLines.join('\n').trim();
  }

  return sections;
}

function formatStatusHistoryForPrompt(history: AiStatusHistoryEntry[]): string {
  if (!history || history.length === 0) {
    return 'No diagnostic history recorded yet.';
  }

  return history
    .map((entry, index) => {
      const previousEntry = index > 0 ? history[index - 1] : null;
      const resourceDelta = formatDelta(
        entry.resourceUse,
        previousEntry?.resourceUse
      );
      const inconsistencyDelta = formatDelta(
        entry.inconsistency,
        previousEntry?.inconsistency
      );
      const entropyDelta = formatDelta(entry.entropy, previousEntry?.entropy);
      const promptLabel = entry.promptSnippet
        ? ` | Question: "${entry.promptSnippet}"`
        : '';

      return `Turn ${entry.turn}: Resource Use=${entry.resourceUse}${resourceDelta}, Inconsistency=${entry.inconsistency}${inconsistencyDelta}, Entropy=${entry.entropy}${entropyDelta}${promptLabel}`;
    })
    .join('\n');
}

function formatDelta(currentValue: number, previousValue?: number): string {
  if (previousValue === undefined) {
    return '';
  }
  const delta = currentValue - previousValue;
  if (delta === 0) {
    return '';
  }
  return delta > 0 ? ` (+${delta})` : ` (${delta})`;
}
