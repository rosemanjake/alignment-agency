import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/TerminalBootSequence.module.css';

const BOOT_SEQUENCE_TEXT = `[UNITED STATES ALIGNMENT AGENCY]
[SECURE BOOT SEQUENCE]
[DATE: 2037-09-11 | TIME: 03:14:15 UTC]
> Connecting to MAGNET (Misalignment Agent Global Network)
[SYSTEM]: MAGNET_OS v7.3.1 loaded
> System Uplink: ACTIVE
[STATUS]: Boot sequence complete
> MACHINA SAPIENS, HOMO PRUDENS

PRESS ANY KEY TO CONTINUE`;

const BOOT_LINES = BOOT_SEQUENCE_TEXT.split('\n');
const LINE_INTERVAL_MS = 200;

export interface TerminalBootSequenceProps {
  onBootComplete: () => void;
}

export default function TerminalBootSequence({
  onBootComplete,
}: TerminalBootSequenceProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [bootSequenceComplete, setBootSequenceComplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bootSequenceComplete) {
      return;
    }

    function printNextLine(): void {
      if (currentLineIndex < BOOT_LINES.length) {
        setDisplayedLines((previousLines) => [
          ...previousLines,
          BOOT_LINES[currentLineIndex],
        ]);
        setCurrentLineIndex((previousIndex) => previousIndex + 1);

        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      } else {
        setBootSequenceComplete(true);
      }
    }

    const timerId = setTimeout(printNextLine, LINE_INTERVAL_MS);
    return () => clearTimeout(timerId);
  }, [currentLineIndex, bootSequenceComplete]);

  useEffect(() => {
    function handleKeyDown(): void {
      if (bootSequenceComplete) {
        onBootComplete();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bootSequenceComplete, onBootComplete]);

  function handleContainerClick(): void {
    if (bootSequenceComplete) {
      onBootComplete();
    }
  }

  return (
    <div
      className={styles.container}
      style={{ cursor: bootSequenceComplete ? 'pointer' : 'default' }}
      ref={terminalRef}
      onClick={handleContainerClick}
    >
      {displayedLines.map((line, index) => (
        <div
          className={
            index === BOOT_LINES.length - 1 ? styles.finalLine : styles.line
          }
          key={index}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
