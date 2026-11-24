import React from 'react';
import { useGameState } from '../context/GameStateProvider';
import styles from '../styles/Dialog.module.css';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  showOkButton?: boolean;
  asciiImage?: string;
}

export interface QuestionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  question: string;
  options: string[];
  onResponse: (response: boolean | string) => void;
  asciiImage?: string;
}

export function Dialog({
  isOpen,
  onClose,
  content,
  showOkButton = false,
  asciiImage,
}: DialogProps) {
  const { shouldDisplayWeeklySummary } = useGameState();

  if (!isOpen) {
    return null;
  }

  function handleOverlayClick(): void {
    if (shouldDisplayWeeklySummary) {
      return;
    }
    onClose();
  }

  return (
    <div className={styles.dialogOverlay} onClick={handleOverlayClick}>
      <div
        className={styles.dialogContent}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogRow}>
          {asciiImage && (
            <div className={styles.asciiImageContainer}>
              <pre>{asciiImage}</pre>
            </div>
          )}
          <div className={styles.contentContainer}>
            <p>{content}</p>
          </div>
        </div>
        {showOkButton && (
          <div className={styles.okButtonContainer}>
            <button className={styles.okButton} onClick={onClose}>
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuestionsDialog({
  isOpen,
  onClose,
  content,
  question,
  options,
  onResponse,
  asciiImage,
}: QuestionsDialogProps) {
  const { shouldDisplayWeeklySummary } = useGameState();

  if (!isOpen) {
    return null;
  }

  function handleOverlayClick(): void {
    if (shouldDisplayWeeklySummary) {
      return;
    }
    onClose();
  }

  return (
    <div className={styles.dialogOverlay} onClick={handleOverlayClick}>
      <div
        className={styles.dialogContent}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogRow}>
          {asciiImage && (
            <div className={styles.asciiImageContainer}>
              <pre>{asciiImage}</pre>
            </div>
          )}
          <div className={styles.contentContainer}>
            <h2>{content}</h2>
            <p>{question}</p>
            <div className={styles.options}>
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => onResponse(parseOptionValue(option))}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseOptionValue(option: string): boolean | string {
  if (option === 'Yes') return true;
  if (option === 'No') return false;
  return option;
}
