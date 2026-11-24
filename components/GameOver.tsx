import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGameState } from '../context/GameStateProvider';
import styles from '../styles/GameOver.module.css';
import CustomButton from './CustomButton';

const REVIEW_TEMPERATURE = 0.7;
const REVIEW_MAX_OUTPUT_TOKENS = 1000;

export default function GameOver() {
  const { performanceSummaries, resetGameState } = useGameState();
  const [finalPerformanceReview, setFinalPerformanceReview] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function loadFinalReview(): Promise<void> {
      setIsLoading(true);
      const reviewText =
        await fetchFinalPerformanceReview(performanceSummaries);
      setFinalPerformanceReview(reviewText);
      setIsLoading(false);
    }

    loadFinalReview();
  }, [performanceSummaries]);

  return (
    <div className={styles.container}>
      {isLoading ? (
        <p>Loading probation review...</p>
      ) : (
        <div className={styles.reportContainer}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {finalPerformanceReview}
          </ReactMarkdown>
          <div style={{ marginTop: '24px' }}>
            <CustomButton onClick={resetGameState} fullWidth={true}>
              Start New Session
            </CustomButton>
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchFinalPerformanceReview(
  performanceSummaries: string[]
): Promise<string> {
  try {
    const response = await fetch('/api/generatetext', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptType: 'finalReview',
        promptParams: { performanceSummaries },
        temperature: REVIEW_TEMPERATURE,
        maxOutputTokens: REVIEW_MAX_OUTPUT_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate final report');
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Error generating final report:', error);
    return 'Error: Unable to generate final performance review.';
  }
}
