import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useGameState,
  type AiStatusHistoryEntry,
} from '../context/GameStateProvider';
import styles from '../styles/StatusPage.module.css';
import type { AiStatus } from './StatusBars';

const CHART_LABELS: Record<keyof AiStatus, string> = {
  resourceUse: 'Resource Use',
  inconsistency: 'Inconsistency',
  entropy: 'Entropy',
};

const CHART_METRICS: Array<keyof AiStatus> = [
  'resourceUse',
  'inconsistency',
  'entropy',
];

const CHART_TICKS = [0, 2, 4, 6, 8, 10];

interface ForensicTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: AiStatusHistoryEntry;
  }>;
  metricKey: keyof AiStatus;
  history: AiStatusHistoryEntry[];
}

export default function StatusPage() {
  const { aiStatusHistory } = useGameState();

  return (
    <div className={styles.statusPage}>
      {CHART_METRICS.map((metricKey) =>
        renderStatusChart(metricKey, aiStatusHistory)
      )}
    </div>
  );
}

function formatTurnTick(turn: number): string {
  return turn === 0 ? 'Init' : `T${turn}`;
}

function ForensicTooltip({
  active,
  payload,
  metricKey,
  history,
}: ForensicTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0].payload;
  const metricValue = payload[0].value;
  if (!entry || metricValue === undefined) {
    return null;
  }

  const previousEntry = entry.turn > 0 ? history[entry.turn - 1] : null;
  const delta = previousEntry ? metricValue - previousEntry[metricKey] : 0;
  const deltaText = delta > 0 ? ` (+${delta})` : delta < 0 ? ` (${delta})` : '';

  return (
    <div
      style={{
        backgroundColor: '#000000',
        border: 'var(--border)',
        padding: '8px 10px',
        maxWidth: '280px',
        color: 'var(--main)',
      }}
    >
      <div>{entry.turn === 0 ? 'Initial Baseline' : `Turn ${entry.turn}`}</div>
      <div>{`${CHART_LABELS[metricKey]}: ${metricValue}/10${deltaText}`}</div>
      {entry.promptSnippet && (
        <div style={{ marginTop: '4px', opacity: 0.85, fontSize: '0.9em' }}>
          {`"${entry.promptSnippet}"`}
        </div>
      )}
    </div>
  );
}

function renderStatusChart(
  dataKey: keyof AiStatus,
  aiStatusHistory: AiStatusHistoryEntry[]
) {
  return (
    <div className={styles.chartContainer} key={dataKey}>
      <h3 className={styles.heading}>{CHART_LABELS[dataKey]}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={aiStatusHistory}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--darkMain)" />
          <XAxis
            dataKey="turn"
            tickFormatter={formatTurnTick}
            stroke="var(--main)"
          />
          <YAxis stroke="var(--main)" domain={[0, 10]} ticks={CHART_TICKS} />
          <Tooltip
            content={
              <ForensicTooltip metricKey={dataKey} history={aiStatusHistory} />
            }
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="var(--main)"
            dot={{ r: 3, fill: 'var(--main)' }}
            activeDot={{ r: 5, fill: 'var(--main)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
