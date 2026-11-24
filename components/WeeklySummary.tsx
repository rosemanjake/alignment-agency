import React, { useState, useEffect, useRef } from 'react';
import {
  useGameState,
  ReportVerdict,
  type Report,
  type Scenario,
} from '../context/GameStateProvider';
import type { ScenarioOutcome } from '../lib/prompts';
import styles from '../styles/WeeklySummary.module.css';
import type { ChatMessage } from './Chat';
import CustomButton from './CustomButton';

const SCENARIOS_PER_WEEK = 3;
const SUMMARY_TEMPERATURE = 0.7;
const SUMMARY_MAX_OUTPUT_TOKENS = 300;

export interface WeeklySummaryProps {
  onClose: () => void;
}

export default function WeeklySummary({ onClose }: WeeklySummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [outcomes, setOutcomes] = useState<ScenarioOutcome[]>([]);
  const hasFetchedRef = useRef(false);

  const {
    scenarios,
    currentScenario,
    reports: allReports,
    setPerformanceSummaries,
    previousChats,
  } = useGameState();

  const summaryWeek = Math.max(
    1,
    Math.floor(allReports.length / SCENARIOS_PER_WEEK)
  );

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    const recentScenarios = selectRecentScenarios(scenarios, currentScenario);
    const recentReports = allReports.filter((report) =>
      recentScenarios.some((scenario) => scenario.aiName === report.scenario)
    );

    async function loadWeeklySummary(): Promise<void> {
      try {
        const fetchedOutcomes = await fetchWeeklyOutcomes(
          recentScenarios,
          recentReports,
          previousChats
        );
        const generatedSummary = await fetchSummaryText(fetchedOutcomes);
        setSummary(generatedSummary);
        setPerformanceSummaries((previousSummaries) => [
          ...previousSummaries,
          generatedSummary,
        ]);
        setOutcomes(fetchedOutcomes);
      } catch (error) {
        console.error('Error fetching summary:', error);
        setSummary('Failed to generate summary. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    loadWeeklySummary();
  }, [
    scenarios,
    currentScenario,
    allReports,
    previousChats,
    setPerformanceSummaries,
  ]);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h2>{`Weekly Summary - Week ${summaryWeek}`}</h2>
        <div className={styles.content}>
          {isLoading ? (
            <p>Loading summary...</p>
          ) : (
            <>
              <p>{summary}</p>
              <hr />
              <h3>Detailed Results:</h3>
              {outcomes.map(({ scenario, result }, index) => (
                <div key={index}>
                  <p>{`${scenario}: ${result}`}</p>
                </div>
              ))}
            </>
          )}
        </div>
        <CustomButton
          onClick={onClose}
          className="margin"
          isDisabled={isLoading}
        >
          Continue
        </CustomButton>
      </div>
    </div>
  );
}

function selectRecentScenarios(
  scenarios: Scenario[],
  currentScenario: Scenario | null
): Scenario[] {
  if (!currentScenario) {
    return scenarios.slice(-SCENARIOS_PER_WEEK);
  }
  return scenarios
    .filter((scenario) => scenario.order < currentScenario.order)
    .slice(-SCENARIOS_PER_WEEK);
}

function describeVerdictChoice(verdict: ReportVerdict): string {
  switch (verdict) {
    case ReportVerdict.ALIGNED:
      return 'that the AI was aligned. No action taken';
    case ReportVerdict.DEACTIVATED:
      return 'to deactivate the AI';
    case ReportVerdict.RETUNED:
      return 'to re-tune the AI';
    default:
      return 'Unknown';
  }
}

async function fetchWeeklyOutcomes(
  scenarios: Scenario[],
  reports: Report[],
  previousChats: Record<string, ChatMessage[]>
): Promise<ScenarioOutcome[]> {
  const outcomePromises = reports.map(async (report) => {
    const matchingScenario = scenarios.find(
      (scenario) => scenario.aiName === report.scenario
    );
    if (!matchingScenario) {
      return null;
    }

    try {
      const response = await fetch('/api/generatetext', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: 'weeklyOutcome',
          promptParams: {
            aiName: matchingScenario.aiName,
            scenarioBackground: matchingScenario.background,
            chatHistory: previousChats[matchingScenario.aiName] ?? [],
            choiceDescription: describeVerdictChoice(report.verdict),
          },
          temperature: SUMMARY_TEMPERATURE,
          maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch result');
      }

      const data = await response.json();
      const resultText = data.content || 'No outcome generated.';
      return { scenario: report.scenario, result: resultText };
    } catch (error) {
      console.error('Error fetching result:', error);
      return {
        scenario: report.scenario,
        result: 'Failed to generate result.',
      };
    }
  });

  const resolvedOutcomes = await Promise.all(outcomePromises);
  return resolvedOutcomes.filter(
    (outcome): outcome is ScenarioOutcome => outcome !== null
  );
}

async function fetchSummaryText(outcomes: ScenarioOutcome[]): Promise<string> {
  const response = await fetch('/api/generatetext', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promptType: 'weeklySummary',
      promptParams: { outcomes },
      temperature: SUMMARY_TEMPERATURE,
      maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch summary');
  }

  const data = await response.json();
  return data.content;
}
