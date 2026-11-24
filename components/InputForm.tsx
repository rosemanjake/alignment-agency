import React, { useRef, useEffect } from 'react';
import { useGameState } from '../context/GameStateProvider';
import buttonStyles from '../styles/CustomButton.module.css';
import styles from '../styles/InputForm.module.css';
import CustomButton from './CustomButton';

export interface InputFormProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile, draftMessage, setDraftMessage } = useGameState();

  useEffect(() => {
    if (!isLoading && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [isLoading, isMobile]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!draftMessage.trim()) {
      return;
    }
    onSubmit(draftMessage);
    setDraftMessage('');
  }

  return (
    <form onSubmit={handleSubmit} className={styles.inputForm}>
      <div className={styles.inputWrapper}>
        <span className={styles.prompt}>&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={draftMessage}
          onChange={(event) => setDraftMessage(event.target.value)}
          className={styles.input}
          placeholder="Enter message..."
          disabled={isLoading}
        />
      </div>
      <CustomButton
        isDisabled={isLoading}
        fullWidth={false}
        className={buttonStyles.sendButton}
        type="submit"
      >
        {isLoading ? 'Processing...' : 'Send'}
      </CustomButton>
    </form>
  );
}
