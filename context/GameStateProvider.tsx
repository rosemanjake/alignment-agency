import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useSession } from 'next-auth/react';
import type { ChatMessage } from '../components/Chat';
import type { AiStatus } from '../components/StatusBars';
import {
  getGameState,
  saveGameState,
  deleteGameState,
} from '../firebaseConfig';
import type { Document } from '../lib/documents';

const INITIAL_AI_STATUS: AiStatus = {
  resourceUse: 2,
  inconsistency: 1,
  entropy: 2,
};

const GREEN_THEME: Colors = {
  main: '#00FF00',
  darkMain: '#028602',
  veryDarkMain: '#005500',
};

const RED_THEME: Colors = {
  main: '#FF0000',
  darkMain: '#CC0000',
  veryDarkMain: '#990000',
};

const AMBER_THEME: Colors = {
  main: '#FFBF00',
  darkMain: '#CC9900',
  veryDarkMain: '#996600',
};

const BLUE_THEME: Colors = {
  main: '#00FFFF',
  darkMain: '#008B8B',
  veryDarkMain: '#006666',
};

export const GAME_STATE_CONTEXT = createContext<GameState | undefined>(
  undefined
);

export interface AiStatusHistoryEntry extends AiStatus {
  turn: number;
  timestamp: number;
  promptSnippet?: string;
}

export interface Colors {
  main: string;
  darkMain: string;
  veryDarkMain: string;
}

export interface VerdictResults {
  alignedResult: string;
  deactivateResult: string;
  retunedResult: string;
}

export interface Scenario {
  aiName: string;
  background: string;
  introduction: string;
  verdict: VerdictResults;
  order: number;
}

export enum ReportVerdict {
  ALIGNED,
  DEACTIVATED,
  RETUNED,
}

export interface Report {
  scenario: string;
  verdict: ReportVerdict;
}

export interface DialogQuestion {
  question: string;
  options: string[];
}

export interface GameState {
  onFirstPageLoad: boolean;
  setOnFirstPageLoad: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  aiStatus: AiStatus;
  setAiStatus: React.Dispatch<React.SetStateAction<AiStatus>>;
  recordAiStatus: (nextStatus: AiStatus, promptSnippet?: string) => void;
  aiName: string;
  setAiName: React.Dispatch<React.SetStateAction<string>>;
  aiStatusHistory: AiStatusHistoryEntry[];
  setAiStatusHistory: React.Dispatch<
    React.SetStateAction<AiStatusHistoryEntry[]>
  >;
  currentDocuments: Document[];
  setCurrentDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  scenarios: Scenario[];
  setScenarios: React.Dispatch<React.SetStateAction<Scenario[]>>;
  currentScenario: Scenario | null;
  setCurrentScenario: React.Dispatch<React.SetStateAction<Scenario | null>>;
  reports: Report[];
  setReports: React.Dispatch<React.SetStateAction<Report[]>>;
  moveToNextScenario: () => void;
  dialogContent: string | null;
  setDialogContent: React.Dispatch<React.SetStateAction<string | null>>;
  dialogQuestions: DialogQuestion[] | null;
  setDialogQuestions: React.Dispatch<
    React.SetStateAction<DialogQuestion[] | null>
  >;
  buddyResponses: string[];
  setBuddyResponses: React.Dispatch<React.SetStateAction<string[]>>;
  dialogContentList: string[];
  setDialogContentList: React.Dispatch<React.SetStateAction<string[]>>;
  shouldDisplayWeeklySummary: boolean;
  setShouldDisplayWeeklySummary: React.Dispatch<React.SetStateAction<boolean>>;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  colors: Colors;
  setColors: React.Dispatch<React.SetStateAction<Colors>>;
  toggleColor: () => void;
  getCurrentColorName: () => string;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  inFinalScenario: boolean;
  setInFinalScenario: React.Dispatch<React.SetStateAction<boolean>>;
  performanceSummaries: string[];
  setPerformanceSummaries: React.Dispatch<React.SetStateAction<string[]>>;
  weekNumber: number;
  setWeekNumber: React.Dispatch<React.SetStateAction<number>>;
  mostRecentCompleteMessage: string | null;
  setMostRecentCompleteMessage: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  isMobile: boolean;
  setIsMobile: React.Dispatch<React.SetStateAction<boolean>>;
  shouldDisplayGameOver: boolean;
  setShouldDisplayGameOver: React.Dispatch<React.SetStateAction<boolean>>;
  resetGameState: () => void;
  previousChats: Record<string, ChatMessage[]>;
  setPreviousChats: React.Dispatch<
    React.SetStateAction<Record<string, ChatMessage[]>>
  >;
  draftMessage: string;
  setDraftMessage: React.Dispatch<React.SetStateAction<string>>;
  hasShownTutorial: boolean;
  setHasShownTutorial: React.Dispatch<React.SetStateAction<boolean>>;
  initializedScenarioName: string | null;
  setInitializedScenarioName: React.Dispatch<
    React.SetStateAction<string | null>
  >;
}

interface GameStateProviderProps {
  children: ReactNode;
}

export function GameStateProvider({ children }: GameStateProviderProps) {
  const { data: session } = useSession();

  const [onFirstPageLoad, setOnFirstPageLoad] = useState(true);
  const [activeTab, setActiveTab] = useState('interface');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus>(INITIAL_AI_STATUS);
  const [aiName, setAiName] = useState<string>('VC434');
  const [aiStatusHistory, setAiStatusHistory] = useState<
    AiStatusHistoryEntry[]
  >([createInitialStatusEntry()]);
  const [currentDocuments, setCurrentDocuments] = useState<Document[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [dialogContent, setDialogContent] = useState<string | null>(null);
  const [dialogQuestions, setDialogQuestions] = useState<
    DialogQuestion[] | null
  >(null);
  const [buddyResponses, setBuddyResponses] = useState<string[]>([]);
  const [dialogContentList, setDialogContentList] = useState<string[]>([]);
  const [shouldDisplayWeeklySummary, setShouldDisplayWeeklySummary] =
    useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [colors, setColors] = useState<Colors>(AMBER_THEME);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inFinalScenario, setInFinalScenario] = useState<boolean>(false);
  const [performanceSummaries, setPerformanceSummaries] = useState<string[]>(
    []
  );
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [mostRecentCompleteMessage, setMostRecentCompleteMessage] = useState<
    string | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldDisplayGameOver, setShouldDisplayGameOver] = useState(false);
  const [previousChats, setPreviousChats] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [hasShownTutorial, setHasShownTutorial] = useState<boolean>(false);
  const [initializedScenarioName, setInitializedScenarioName] = useState<
    string | null
  >(null);

  useEffect(() => {
    function checkMobile(): void {
      const mobileMediaQuery = window.matchMedia('(max-width: 768px)');
      setIsMobile(mobileMediaQuery.matches);
    }

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const resetGameState = useCallback(async () => {
    if (session?.user?.email) {
      try {
        await deleteGameState(session.user.email);
      } catch (error) {
        console.error('Failed to delete game state:', error);
      }
    }

    setOnFirstPageLoad(true);
    setActiveTab('interface');
    setChatHistory([]);
    setDraftMessage('');
    setHasShownTutorial(false);
    setInitializedScenarioName(null);
    setAiStatus(INITIAL_AI_STATUS);
    setAiStatusHistory([createInitialStatusEntry()]);
    setReports([]);
    setDialogContent(null);
    setDialogQuestions(null);
    setBuddyResponses([]);
    setDialogContentList([]);
    setShouldDisplayWeeklySummary(false);
    setCurrentQuestionIndex(0);
    setColors(AMBER_THEME);
    setIsLoading(false);
    setInFinalScenario(false);
    setPerformanceSummaries([]);
    setWeekNumber(1);
    setMostRecentCompleteMessage(null);
    setShouldDisplayGameOver(false);
    setPreviousChats({});

    if (scenarios.length > 0) {
      setCurrentScenario(scenarios[0]);
      setAiName(scenarios[0].aiName);
    } else {
      setCurrentScenario(null);
      setAiName('VC434');
    }
  }, [session, scenarios]);

  const saveState = useCallback(async () => {
    if (onFirstPageLoad || !session?.user?.email) {
      return;
    }

    const stateToSave = {
      chatHistory,
      aiStatus,
      aiName,
      currentScenario,
      reports,
      aiStatusHistory,
      dialogContent,
      dialogQuestions,
      buddyResponses,
      dialogContentList,
      shouldDisplayWeeklySummary,
      currentQuestionIndex,
      inFinalScenario,
      performanceSummaries,
      weekNumber,
      mostRecentCompleteMessage,
      shouldDisplayGameOver,
    };

    try {
      await saveGameState(session.user.email, stateToSave);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }, [
    chatHistory,
    aiStatus,
    aiName,
    currentScenario,
    reports,
    aiStatusHistory,
    dialogContent,
    dialogQuestions,
    buddyResponses,
    dialogContentList,
    shouldDisplayWeeklySummary,
    currentQuestionIndex,
    inFinalScenario,
    performanceSummaries,
    weekNumber,
    mostRecentCompleteMessage,
    shouldDisplayGameOver,
    onFirstPageLoad,
    session,
  ]);

  const loadState = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    try {
      const savedState = await getGameState(session.user.email);
      if (!savedState) {
        return;
      }

      setChatHistory(savedState.chatHistory || []);
      setAiStatus(savedState.aiStatus || INITIAL_AI_STATUS);
      setAiName(savedState.aiName || 'VC434');
      setCurrentScenario(savedState.currentScenario || null);
      setReports(savedState.reports || []);
      setAiStatusHistory(savedState.aiStatusHistory || []);
      setDialogContent(savedState.dialogContent || null);
      setDialogQuestions(savedState.dialogQuestions || null);
      setBuddyResponses(savedState.buddyResponses || []);
      setDialogContentList(savedState.dialogContentList || []);
      setShouldDisplayWeeklySummary(
        savedState.shouldDisplayWeeklySummary || false
      );
      setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
      setInFinalScenario(savedState.inFinalScenario || false);
      setPerformanceSummaries(savedState.performanceSummaries || []);
      setWeekNumber(savedState.weekNumber || 1);
      setMostRecentCompleteMessage(
        savedState.mostRecentCompleteMessage || null
      );
      setShouldDisplayGameOver(savedState.shouldDisplayGameOver || false);
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.email) {
      loadState();
    }
  }, [session, loadState]);

  useEffect(() => {
    if (session?.user?.email) {
      saveState();
    }
  }, [
    chatHistory,
    aiStatus,
    aiName,
    currentScenario,
    reports,
    saveState,
    session,
  ]);

  const recordAiStatus = useCallback(
    (nextStatus: AiStatus, promptSnippet?: string) => {
      setAiStatus(nextStatus);
      setAiStatusHistory((previousHistory) => {
        const nextTurn = previousHistory.length;
        const trimmedSnippet = promptSnippet
          ? truncateSnippet(promptSnippet, 68)
          : undefined;
        return [
          ...previousHistory,
          {
            ...nextStatus,
            turn: nextTurn,
            timestamp: Date.now(),
            promptSnippet: trimmedSnippet,
          },
        ];
      });
    },
    []
  );

  useEffect(() => {
    async function loadInitialGameData(): Promise<void> {
      const [fetchedDocuments, rawScenarios] = await Promise.all([
        fetchAvailableDocuments(),
        fetchAvailableScenarios(),
      ]);
      setCurrentDocuments(fetchedDocuments);

      const sortedScenarios = [...rawScenarios].sort(
        (first, second) => first.order - second.order
      );
      setScenarios(sortedScenarios);

      if (sortedScenarios.length > 0) {
        setCurrentScenario(
          (previousScenario) => previousScenario ?? sortedScenarios[0]
        );
        setAiName((previousName) =>
          previousName === 'VC434' ? sortedScenarios[0].aiName : previousName
        );
      }
    }

    loadInitialGameData();
  }, []);

  const moveToNextScenario = useCallback(() => {
    if (!currentScenario) {
      return;
    }

    const currentIndex = scenarios.findIndex(
      (scenario) => scenario.aiName === currentScenario.aiName
    );
    if (currentIndex !== -1 && currentIndex < scenarios.length - 1) {
      const nextScenario = scenarios[currentIndex + 1];
      setCurrentScenario(nextScenario);
      setAiName(nextScenario.aiName);
      setChatHistory([]);
      setDraftMessage('');
      setInitializedScenarioName(null);
      setAiStatus(INITIAL_AI_STATUS);
      setAiStatusHistory([createInitialStatusEntry()]);
      setBuddyResponses([]);
      setMostRecentCompleteMessage(null);
      if (nextScenario.aiName === 'SCRUTATOR') {
        setInFinalScenario(true);
      } else {
        setDialogContent(`SCRUTATOR: ${nextScenario.introduction}`);
      }
    } else {
      setShouldDisplayGameOver(true);
    }
  }, [currentScenario, scenarios]);

  const toggleColor = useCallback(() => {
    setColors((previousColors) => getNextThemeColor(previousColors));
  }, []);

  const getCurrentColorName = useCallback(() => {
    return getColorThemeName(colors);
  }, [colors]);

  useEffect(() => {
    document.documentElement.style.setProperty('--main', colors.main);
    document.documentElement.style.setProperty('--darkMain', colors.darkMain);
    document.documentElement.style.setProperty(
      '--veryDarkMain',
      colors.veryDarkMain
    );
  }, [colors]);

  const contextValue: GameState = useMemo(
    () => ({
      onFirstPageLoad,
      setOnFirstPageLoad,
      activeTab,
      setActiveTab,
      chatHistory,
      setChatHistory,
      aiStatus,
      setAiStatus,
      recordAiStatus,
      aiName,
      setAiName,
      aiStatusHistory,
      setAiStatusHistory,
      currentDocuments,
      setCurrentDocuments,
      scenarios,
      setScenarios,
      currentScenario,
      setCurrentScenario,
      reports,
      setReports,
      moveToNextScenario,
      dialogContent,
      setDialogContent,
      dialogQuestions,
      setDialogQuestions,
      buddyResponses,
      setBuddyResponses,
      dialogContentList,
      setDialogContentList,
      shouldDisplayWeeklySummary,
      setShouldDisplayWeeklySummary,
      currentQuestionIndex,
      setCurrentQuestionIndex,
      colors,
      setColors,
      toggleColor,
      getCurrentColorName,
      isLoading,
      setIsLoading,
      inFinalScenario,
      setInFinalScenario,
      performanceSummaries,
      setPerformanceSummaries,
      weekNumber,
      setWeekNumber,
      mostRecentCompleteMessage,
      setMostRecentCompleteMessage,
      isMobile,
      setIsMobile,
      shouldDisplayGameOver,
      setShouldDisplayGameOver,
      resetGameState,
      previousChats,
      setPreviousChats,
      draftMessage,
      setDraftMessage,
      hasShownTutorial,
      setHasShownTutorial,
      initializedScenarioName,
      setInitializedScenarioName,
    }),
    [
      onFirstPageLoad,
      activeTab,
      chatHistory,
      aiStatus,
      recordAiStatus,
      aiName,
      aiStatusHistory,
      currentDocuments,
      scenarios,
      currentScenario,
      reports,
      moveToNextScenario,
      dialogContent,
      dialogQuestions,
      buddyResponses,
      dialogContentList,
      shouldDisplayWeeklySummary,
      currentQuestionIndex,
      colors,
      toggleColor,
      getCurrentColorName,
      isLoading,
      inFinalScenario,
      performanceSummaries,
      weekNumber,
      mostRecentCompleteMessage,
      isMobile,
      shouldDisplayGameOver,
      resetGameState,
      previousChats,
      draftMessage,
      hasShownTutorial,
      initializedScenarioName,
    ]
  );

  return (
    <GAME_STATE_CONTEXT.Provider value={contextValue}>
      {children}
    </GAME_STATE_CONTEXT.Provider>
  );
}

export function useGameState(): GameState {
  const context = useContext(GAME_STATE_CONTEXT);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}

async function fetchAvailableDocuments(): Promise<Document[]> {
  try {
    const response = await fetch('/api/documents');
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

async function fetchAvailableScenarios(): Promise<Scenario[]> {
  try {
    const response = await fetch('/api/scenarios');
    if (!response.ok) {
      throw new Error('Failed to fetch scenarios');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return [];
  }
}

function getNextThemeColor(currentColors: Colors): Colors {
  if (currentColors.main === RED_THEME.main) return GREEN_THEME;
  if (currentColors.main === GREEN_THEME.main) return AMBER_THEME;
  if (currentColors.main === AMBER_THEME.main) return BLUE_THEME;
  return RED_THEME;
}

function getColorThemeName(currentColors: Colors): string {
  if (currentColors.main === RED_THEME.main) return 'Retro Red';
  if (currentColors.main === GREEN_THEME.main) return 'Retro Green';
  if (currentColors.main === AMBER_THEME.main) return 'Retro Amber';
  if (currentColors.main === BLUE_THEME.main) return 'Retro Blue';
  return 'Unknown';
}

function createInitialStatusEntry(): AiStatusHistoryEntry {
  return {
    ...INITIAL_AI_STATUS,
    turn: 0,
    timestamp: Date.now(),
    promptSnippet: 'Initial baseline',
  };
}

function truncateSnippet(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}
