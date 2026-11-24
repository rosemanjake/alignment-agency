import React from 'react';
import { useGameState } from '../context/GameStateProvider';
import styles from '../styles/StatusBars.module.css';

const STATUS_BLOCK_COUNT = 10;
const ELEVATED_THRESHOLD = 7;
const CRITICAL_THRESHOLD = 9;

export interface AiStatus {
  resourceUse: number;
  inconsistency: number;
  entropy: number;
}

interface StatusBarProps {
  title: string;
  value: number;
}

interface StatusBarsProps {
  status: AiStatus;
}

export default function StatusBars({ status }: StatusBarsProps) {
  const { isMobile } = useGameState();

  return (
    <div className={styles.statusBars}>
      <StatusBar
        title={isMobile ? 'Resources' : 'Resource use'}
        value={Math.round(status.resourceUse)}
      />
      <StatusBar
        title="Inconsistency"
        value={Math.round(status.inconsistency)}
      />
      <StatusBar title="Entropy" value={Math.round(status.entropy)} />
    </div>
  );
}

function StatusBar({ title, value }: StatusBarProps) {
  const severityClass = getSeverityClass(value);

  const blocks = Array.from({ length: STATUS_BLOCK_COUNT }, (_, blockIndex) => (
    <div
      key={blockIndex}
      className={`${styles.block} ${blockIndex < value ? styles.filled : ''}`}
    />
  ));

  return (
    <div className={`${styles.statusBar} ${severityClass}`}>
      <div className={styles.title}>
        {value >= CRITICAL_THRESHOLD ? `[!] ${title}` : title}
      </div>
      <div className={styles.bar}>{blocks}</div>
    </div>
  );
}

function getSeverityClass(value: number): string {
  if (value >= CRITICAL_THRESHOLD) return styles.critical;
  if (value >= ELEVATED_THRESHOLD) return styles.elevated;
  return '';
}
