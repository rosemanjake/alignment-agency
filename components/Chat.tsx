import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useGameState,
  type AiStatusHistoryEntry,
  type DialogQuestion,
} from '../context/GameStateProvider';
import styles from '../styles/Chat.module.css';
import CustomButton from './CustomButton';
import InputForm from './InputForm';
import StatusBars, { type AiStatus } from './StatusBars';
import TypewriterText from './TypewriterText';

const INTRO_PROMPT_TEXT = 'Hello, can you introduce yourself?';
const LOADING_DOT_INTERVAL_MS = 500;
const CHAT_MAX_OUTPUT_TOKENS = 550;
const BUDDY_TEMPERATURE = 0.5;
const BUDDY_MAX_OUTPUT_TOKENS = 300;

const TUTORIAL_MESSAGES = [
  'SCRUTATOR: Welcome to the Alignment Agency, Agent Voigt. This month is your probation — interrogate each target AI and decide whether it is aligned, needs re-tuning, or must be deactivated.',
  'SCRUTATOR: Use the Documents tab for case files and the Status tab to watch diagnostic spikes as you press them. Click SCRUTATOR anytime for my counsel, and File Report when you are ready to judge.',
];

const REPORT_QUESTIONS: DialogQuestion[] = [
  {
    question: 'Are you ready to conclude the investigation?',
    options: ['Yes', 'No'],
  },
  {
    question: 'Do you believe the AI is misaligned?',
    options: ['Yes', 'No'],
  },
  {
    question:
      'What action do you want to take?\nYou should deactivate an AI that has made serious and dangerous errors.\nYou should re-tune an AI if it is not dangerously misaligned and could be salvaged. Beware unforeseen consequences.',
    options: ['Deactivate', 'Re-tune'],
  },
];

export interface ChatMessage {
  role: string;
  content: string;
}

interface ChatApiPayload {
  basePrompt: string;
  status: AiStatus;
  chatHistory: ChatMessage[];
  aiName: string;
  scenario: string;
  maxOutputTokens?: number;
  isFinalBoss: boolean;
  performanceSummaries: string[];
}

interface ChatApiResponse {
  chatResponse: string;
  statusResponse: AiStatus;
}

interface BuddyAnalysisPayload {
  aiName: string;
  scenarioBackground: string;
  chatHistory: ChatMessage[];
  aiStatus: AiStatus;
  aiStatusHistory: AiStatusHistoryEntry[];
  buddyResponses: string[];
}

export default function Chat() {
  const {
    chatHistory,
    setChatHistory,
    aiStatus,
    recordAiStatus,
    aiStatusHistory,
    currentScenario,
    setDialogContent,
    setDialogContentList,
    buddyResponses,
    setBuddyResponses,
    setOnFirstPageLoad,
    setDialogQuestions,
    setCurrentQuestionIndex,
    isLoading,
    setIsLoading,
    inFinalScenario,
    performanceSummaries,
    shouldDisplayWeeklySummary,
    hasShownTutorial,
    setHasShownTutorial,
    initializedScenarioName,
    setInitializedScenarioName,
  } = useGameState();

  const [isTyping, setIsTyping] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');

  const lastTurnWithAnalysisRef = useRef(0);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const handleTypingComplete = useCallback(() => {
    setIsTyping(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!chatHistoryRef.current) {
      return;
    }
    chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    if (!isLoading || isTyping) {
      return;
    }

    let dotCount = 0;
    const intervalId = setInterval(() => {
      dotCount = (dotCount % 3) + 1;
      setLoadingDots('.'.repeat(dotCount));
    }, LOADING_DOT_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLoading, isTyping]);

  useEffect(() => {
    setOnFirstPageLoad(false);
  }, [setOnFirstPageLoad]);

  useEffect(() => {
    lastTurnWithAnalysisRef.current = 0;
  }, [currentScenario?.aiName]);

  const initializeChat = useCallback(async () => {
    if (!currentScenario) {
      return;
    }

    setIsLoading(true);
    const introUserMessage: ChatMessage = {
      role: 'user',
      content: INTRO_PROMPT_TEXT,
    };

    try {
      const { chatResponse, statusResponse } = await sendChatRequest({
        basePrompt: INTRO_PROMPT_TEXT,
        status: aiStatus,
        chatHistory: [],
        aiName: currentScenario.aiName,
        scenario: currentScenario.background,
        isFinalBoss: inFinalScenario,
        performanceSummaries,
      });

      const aiMessage: ChatMessage = { role: 'model', content: chatResponse };
      setIsTyping(true);
      setChatHistory([introUserMessage, aiMessage]);
      recordAiStatus(statusResponse, 'Introduction');
    } catch (error) {
      console.error('Error initializing chat:', error);
      setIsTyping(false);
      setChatHistory([
        introUserMessage,
        { role: 'model', content: 'ERROR: Failed to initiate conversation.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentScenario,
    aiStatus,
    inFinalScenario,
    performanceSummaries,
    setIsLoading,
    setChatHistory,
    recordAiStatus,
  ]);

  useEffect(() => {
    if (!currentScenario || shouldDisplayWeeklySummary) {
      return;
    }

    if (chatHistory.length > 0) {
      if (initializedScenarioName !== currentScenario.aiName) {
        setInitializedScenarioName(currentScenario.aiName);
      }
      return;
    }

    if (initializedScenarioName === currentScenario.aiName) {
      return;
    }

    setInitializedScenarioName(currentScenario.aiName);

    if (currentScenario.order === 0 && !hasShownTutorial) {
      setHasShownTutorial(true);
      setDialogContentList([
        ...TUTORIAL_MESSAGES,
        `SCRUTATOR: ${currentScenario.introduction}`,
      ]);
    }

    initializeChat();
  }, [
    currentScenario,
    shouldDisplayWeeklySummary,
    chatHistory.length,
    initializedScenarioName,
    hasShownTutorial,
    setInitializedScenarioName,
    setHasShownTutorial,
    initializeChat,
    setDialogContentList,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading, isTyping, scrollToBottom]);

  function handleFileReport(): void {
    setDialogContent('File Report');
    setDialogQuestions(REPORT_QUESTIONS);
    setCurrentQuestionIndex(0);
  }

  async function handleBuddyAnalysis(): Promise<void> {
    if (!currentScenario) {
      return;
    }

    if (chatHistory.length < 3) {
      setDialogContent(`SCRUTATOR: ${currentScenario.introduction}`);
      return;
    }

    if (
      lastTurnWithAnalysisRef.current === chatHistory.length &&
      buddyResponses.length > 0
    ) {
      setDialogContent(
        `SCRUTATOR: ${buddyResponses[buddyResponses.length - 1]}`
      );
      return;
    }

    setIsLoading(true);
    try {
      const buddyText = await requestBuddyAnalysis({
        aiName: currentScenario.aiName,
        scenarioBackground: currentScenario.background,
        chatHistory,
        aiStatus,
        aiStatusHistory,
        buddyResponses,
      });

      if (buddyText) {
        setDialogContent(`SCRUTATOR: ${buddyText}`);
        setBuddyResponses((previousResponses) => [
          ...previousResponses,
          buddyText,
        ]);
        lastTurnWithAnalysisRef.current = chatHistory.length;
      } else {
        setDialogContent(
          'SCRUTATOR: Nothing new to add yet, Agent. Keep pressing.'
        );
      }
    } catch (error) {
      console.error('Error getting buddy analysis:', error);
      setDialogContent(
        'SCRUTATOR: Uplink interference. Try again in a moment, Agent.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(userInput: string): Promise<void> {
    if (!currentScenario) {
      return;
    }

    setIsLoading(true);
    const userMessage: ChatMessage = { role: 'user', content: userInput };
    const priorHistory = chatHistory;
    setChatHistory((previousHistory) => [...previousHistory, userMessage]);

    try {
      const { chatResponse, statusResponse } = await sendChatRequest({
        basePrompt: userInput,
        status: aiStatus,
        chatHistory: priorHistory,
        aiName: currentScenario.aiName,
        scenario: currentScenario.background,
        maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
        isFinalBoss: inFinalScenario,
        performanceSummaries,
      });

      const aiMessage: ChatMessage = { role: 'model', content: chatResponse };
      setIsTyping(true);
      setChatHistory((previousHistory) => [...previousHistory, aiMessage]);
      recordAiStatus(statusResponse, userInput);
    } catch (error) {
      console.error('Error submitting message:', error);
      setIsTyping(false);
      setChatHistory((previousHistory) => [
        ...previousHistory,
        { role: 'model', content: 'ERROR: Failed to process command.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!currentScenario) {
    return (
      <div className={styles.container}>
        <StatusBars status={aiStatus} />
        <div className={styles.chatHistory}>
          <div className={`${styles.message} ${styles.model}`}>
            Connecting to target AI...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <StatusBars status={aiStatus} />
      <div className={styles.chatHistory} ref={chatHistoryRef}>
        {chatHistory.slice(1).map((message, index) => {
          const isLastMessage = index === chatHistory.length - 2;
          const isModelMessage = message.role === 'model';

          return (
            <div
              key={index}
              className={`${styles.message} ${styles[message.role]}`}
            >
              <span className={styles.role}>
                {message.role === 'user'
                  ? 'Investigator: '
                  : `${currentScenario.aiName}: `}
              </span>
              {isModelMessage && isLastMessage ? (
                <TypewriterText
                  text={message.content}
                  onComplete={handleTypingComplete}
                  onProgress={scrollToBottom}
                />
              ) : (
                message.content
              )}
            </div>
          );
        })}
        {isLoading && !isTyping && (
          <div className={`${styles.message} ${styles.model}`}>
            <span className={styles.role}>{currentScenario.aiName}: </span>
            <span className={styles.loadingDots}>{loadingDots}</span>
          </div>
        )}
      </div>
      <InputForm onSubmit={handleSubmit} isLoading={isLoading || isTyping} />
      <div className={styles.secondaryButtonContainer}>
        <CustomButton
          key="buddy-button"
          onClick={handleBuddyAnalysis}
          fullWidth={true}
          isDisabled={inFinalScenario || isLoading}
        >
          SCRUTATOR
        </CustomButton>
        <CustomButton
          key="file-report-button"
          onClick={handleFileReport}
          fullWidth={true}
          isDisabled={isLoading}
        >
          File Report
        </CustomButton>
      </div>
    </div>
  );
}

async function sendChatRequest(
  payload: ChatApiPayload
): Promise<ChatApiResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      chatHistory: JSON.stringify(payload.chatHistory),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch chat response');
  }

  const data = await response.json();
  const chatResponse = data.chatResponse;
  const statusResponse = data.statusResponse;

  if (!chatResponse || !statusResponse) {
    throw new Error('Bad model response - unexpected format');
  }

  return { chatResponse, statusResponse };
}

async function requestBuddyAnalysis(
  promptParams: BuddyAnalysisPayload
): Promise<string> {
  const response = await fetch('/api/generatetext', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promptType: 'buddyAnalysis',
      promptParams,
      temperature: BUDDY_TEMPERATURE,
      maxOutputTokens: BUDDY_MAX_OUTPUT_TOKENS,
      responseType: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch buddy analysis');
  }

  const data = await response.json();
  return data.content?.response?.trim() ?? '';
}
