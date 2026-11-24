import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../context/GameStateProvider';

const TICK_INTERVAL_MS = 16;
const GLITCH_GLYPHS = ['▓', '▒', '░', '#', '%', '@', '/', '?'];

export interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onProgress?: () => void;
}

export default function TypewriterText({
  text,
  speed = text.length > 100 ? 4 : 8,
  onComplete,
  onProgress,
}: TypewriterTextProps) {
  const {
    mostRecentCompleteMessage,
    setMostRecentCompleteMessage,
    chatHistory,
    setIsLoading,
    isMobile,
    shouldDisplayWeeklySummary,
    aiStatus,
  } = useGameState();

  const isAlreadyComplete =
    chatHistory[chatHistory.length - 1]?.content === text &&
    mostRecentCompleteMessage === text;

  const [visibleLength, setVisibleLength] = useState(
    isAlreadyComplete ? text.length : 0
  );
  const [glitchTail, setGlitchTail] = useState('');
  const completedRef = useRef(isAlreadyComplete);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  useEffect(() => {
    onProgressRef.current?.();
  }, [visibleLength]);

  useEffect(() => {
    if (isAlreadyComplete) {
      setVisibleLength(text.length);
      setGlitchTail('');
      completedRef.current = true;
      onCompleteRef.current?.();
    } else {
      setVisibleLength(0);
      setGlitchTail('');
      completedRef.current = false;
    }
    // Only reset when the message text itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (shouldDisplayWeeklySummary) {
      setIsLoading(false);
    }
  }, [shouldDisplayWeeklySummary, setIsLoading]);

  useEffect(() => {
    if (shouldDisplayWeeklySummary || isAlreadyComplete) {
      return;
    }

    if (visibleLength < text.length) {
      const effectiveSpeed = computeEffectiveSpeed(speed, aiStatus.resourceUse);
      const effectiveTickMs = Math.max(TICK_INTERVAL_MS, effectiveSpeed);
      const charsPerTick = Math.max(
        1,
        Math.round(effectiveTickMs / Math.max(1, effectiveSpeed))
      );

      const timeoutId = setTimeout(() => {
        setVisibleLength((previousLength) =>
          Math.min(text.length, previousLength + charsPerTick)
        );
        setGlitchTail(generateGlitchTail(aiStatus.entropy));
      }, effectiveTickMs);

      return () => clearTimeout(timeoutId);
    }

    if (!completedRef.current) {
      completedRef.current = true;
      setGlitchTail('');
      setIsLoading(false);
      onCompleteRef.current?.();
      setMostRecentCompleteMessage(text);
    }
  }, [
    visibleLength,
    text,
    speed,
    aiStatus.resourceUse,
    aiStatus.entropy,
    shouldDisplayWeeklySummary,
    isAlreadyComplete,
    setIsLoading,
    setMostRecentCompleteMessage,
  ]);

  if (shouldDisplayWeeklySummary) {
    return null;
  }

  if (isAlreadyComplete || visibleLength >= text.length) {
    return <span>{text}</span>;
  }

  const visiblePrefix = text.slice(0, visibleLength);
  const hiddenSuffix = text.slice(visibleLength + glitchTail.length);

  if (isMobile) {
    return (
      <span>
        {visiblePrefix}
        {glitchTail}
      </span>
    );
  }

  return (
    <span>
      <span>{visiblePrefix}</span>
      {glitchTail && <span style={{ opacity: 0.7 }}>{glitchTail}</span>}
      <span style={{ visibility: 'hidden' }}>{hiddenSuffix}</span>
    </span>
  );
}

function computeEffectiveSpeed(baseSpeed: number, resourceUse: number): number {
  if (resourceUse >= 9) {
    return Math.round(baseSpeed * 3);
  }
  if (resourceUse >= 8) {
    return Math.round(baseSpeed * 2);
  }
  return baseSpeed;
}

function generateGlitchTail(entropy: number): string {
  if (entropy < 7) {
    return '';
  }

  const probability = entropy >= 9 ? 0.6 : 0.3;
  if (Math.random() > probability) {
    return '';
  }

  const tailLength = entropy >= 9 ? 2 : 1;
  let result = '';
  for (let index = 0; index < tailLength; index++) {
    const randomIndex = Math.floor(Math.random() * GLITCH_GLYPHS.length);
    result += GLITCH_GLYPHS[randomIndex];
  }
  return result;
}
