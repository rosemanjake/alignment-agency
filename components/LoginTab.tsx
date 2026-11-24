import React, { useState } from 'react';
import { useGameState } from '../context/GameStateProvider';
import styles from '../styles/Home.module.css';
import CustomButton from './CustomButton';
import { QuestionsDialog } from './Dialog';

const NEW_SESSION_OPTIONS = ['Yes', 'No'];

export default function LoginTab() {
  const [shouldDisplayDialog, setShouldDisplayDialog] =
    useState<boolean>(false);
  const { toggleColor, getCurrentColorName, resetGameState } = useGameState();

  function handleResetResponse(response: boolean | string): void {
    setShouldDisplayDialog(false);
    if (response) {
      resetGameState();
    }
  }

  return (
    <>
      {shouldDisplayDialog && (
        <QuestionsDialog
          isOpen={true}
          onClose={() => setShouldDisplayDialog(false)}
          content="New game"
          question="Are you sure you want to start a new session? You will lose any saved or unsaved progress."
          options={NEW_SESSION_OPTIONS}
          onResponse={handleResetResponse}
        />
      )}
      <div className={styles.loginContainer}>
        <h2>Settings</h2>
        <div className={styles.colorToggle}>
          <CustomButton onClick={toggleColor} fullWidth={true}>
            Toggle Color (Current: {getCurrentColorName()})
          </CustomButton>
        </div>
        <h2>New session</h2>
        <CustomButton
          onClick={() => setShouldDisplayDialog(true)}
          fullWidth={true}
        >
          Start new session
        </CustomButton>
      </div>
    </>
  );
}
