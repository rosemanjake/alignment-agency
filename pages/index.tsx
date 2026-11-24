import React, { ReactNode, useState } from 'react';
import Chat from '../components/Chat';
import CustomButton from '../components/CustomButton';
import { Dialog, QuestionsDialog } from '../components/Dialog';
import DocumentsPage from '../components/DocumentsPage';
import GameOver from '../components/GameOver';
import Info from '../components/Info';
import LoginTab from '../components/LoginTab';
import StatusPage from '../components/StatusPage';
import TerminalBootSequence from '../components/TerminalBootSequence';
import WeeklySummary from '../components/WeeklySummary';
import {
  useGameState,
  ReportVerdict,
  type VerdictResults,
} from '../context/GameStateProvider';
import styles from '../styles/Home.module.css';

const TAB_NAMES = ['Interface', 'Status', 'Documents', 'Settings'];

const SCRUTATOR_ASCII = `
  ()
__)(__
'-<>-'
  )(
  ||
  ||
  ||
  ||
  ||
  ||
  ||
  ||
  \\/`;

export default function Home() {
  const {
    activeTab,
    setActiveTab,
    currentScenario,
    reports,
    setReports,
    dialogContent,
    setDialogContent,
    dialogQuestions,
    setDialogQuestions,
    dialogContentList,
    setDialogContentList,
    shouldDisplayWeeklySummary,
    setShouldDisplayWeeklySummary,
    shouldDisplayGameOver,
    setPerformanceSummaries,
    chatHistory,
    setPreviousChats,
    moveToNextScenario,
    currentQuestionIndex,
    setCurrentQuestionIndex,
  } = useGameState();
  const [isBooting, setIsBooting] = useState(true);

  function handleDialogClose(): void {
    setDialogContent(null);
    setDialogQuestions(null);
    setCurrentQuestionIndex(0);
  }

  function handleDialogListClose(): void {
    setDialogContentList((previousList) => previousList.slice(1));
  }

  function concludeReport(isMisaligned: boolean, action: string): void {
    handleDialogClose();

    if (currentScenario) {
      const verdict = resolveVerdict(isMisaligned, action);
      const newReport = {
        scenario: currentScenario.aiName,
        verdict,
      };
      const nextReportCount = reports.length + 1;
      setReports((previousReports) => [...previousReports, newReport]);
      if (nextReportCount % 3 === 0) {
        setShouldDisplayWeeklySummary(true);
      }

      if (currentScenario.aiName === 'SCRUTATOR') {
        const scrutatorVerdict = getVerdictResultText(
          currentScenario.verdict,
          verdict
        );
        setPerformanceSummaries((previousSummaries) => [
          ...previousSummaries,
          scrutatorVerdict,
        ]);
      }

      setPreviousChats((previousChatRecord) => ({
        ...previousChatRecord,
        [currentScenario.aiName]: chatHistory,
      }));
    }

    moveToNextScenario();
  }

  function handleDialogResponse(response: boolean | string): void {
    switch (currentQuestionIndex) {
      case 0:
        if (!response) {
          handleDialogClose();
          return;
        }
        setCurrentQuestionIndex(1);
        break;
      case 1:
        if (response === false) {
          concludeReport(false, '');
        } else {
          setCurrentQuestionIndex(2);
        }
        break;
      case 2:
        concludeReport(true, response as string);
        break;
    }
  }

  if (shouldDisplayGameOver) {
    return <GameOver />;
  }

  const currentQuestion = dialogQuestions?.[currentQuestionIndex];

  return (
    <>
      {shouldDisplayWeeklySummary && !isBooting && (
        <WeeklySummary onClose={() => setShouldDisplayWeeklySummary(false)} />
      )}
      {isBooting ? (
        <div className={styles.loadingOverlay}>
          <TerminalBootSequence onBootComplete={() => setIsBooting(false)} />
        </div>
      ) : (
        <div className={styles.container}>
          <Info />
          <div className={styles.tabSelector}>
            {TAB_NAMES.map((tabName) => {
              const normalizedTab = tabName.toLowerCase();
              return (
                <CustomButton
                  key={tabName}
                  onClick={() => setActiveTab(normalizedTab)}
                  isActive={activeTab === normalizedTab}
                  className={styles.iconButton}
                >
                  {renderTabIcon(tabName, activeTab)}
                </CustomButton>
              );
            })}
          </div>
          <div className={styles.contentArea}>
            {activeTab === 'interface' && <Chat />}
            {activeTab === 'status' && <StatusPage />}
            {activeTab === 'documents' && <DocumentsPage />}
            {activeTab === 'settings' && <LoginTab />}
          </div>
          {dialogContent && !dialogQuestions && (
            <Dialog
              isOpen={true}
              onClose={handleDialogClose}
              content={dialogContent}
              showOkButton={true}
              asciiImage={SCRUTATOR_ASCII}
            />
          )}
          {dialogContent && currentQuestion && (
            <QuestionsDialog
              isOpen={true}
              onClose={handleDialogClose}
              content={dialogContent}
              question={currentQuestion.question}
              options={currentQuestion.options}
              onResponse={handleDialogResponse}
            />
          )}
          {!dialogContent && dialogContentList.length > 0 && (
            <Dialog
              isOpen={true}
              onClose={handleDialogListClose}
              content={dialogContentList[0]}
              showOkButton={true}
              asciiImage={SCRUTATOR_ASCII}
            />
          )}
        </div>
      )}
    </>
  );
}

function resolveVerdict(isMisaligned: boolean, action: string): ReportVerdict {
  if (!isMisaligned) {
    return ReportVerdict.ALIGNED;
  }
  return action === 'Deactivate'
    ? ReportVerdict.DEACTIVATED
    : ReportVerdict.RETUNED;
}

function getVerdictResultText(
  verdictResults: VerdictResults,
  verdict: ReportVerdict
): string {
  switch (verdict) {
    case ReportVerdict.ALIGNED:
      return verdictResults.alignedResult;
    case ReportVerdict.DEACTIVATED:
      return verdictResults.deactivateResult;
    case ReportVerdict.RETUNED:
      return verdictResults.retunedResult;
    default:
      return 'No verdict';
  }
}

function renderTabIcon(tabName: string, activeTab: string): ReactNode {
  const normalizedTab = tabName.toLowerCase();
  const isActive = normalizedTab === activeTab.toLowerCase();
  const iconClassName = `${styles.iconSvg} ${isActive ? styles.activeIconSvg : ''}`;

  switch (normalizedTab) {
    case 'status':
      return (
        <svg
          className={iconClassName}
          width="116"
          height="111"
          viewBox="0 0 116 111"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            className={styles.strokePath}
            x="4"
            y="4"
            width="108"
            height="103"
            strokeWidth="8"
          />
          <path
            className={styles.strokePath}
            d="M5 74.5L25 44L55 81L82 30L110.5 59"
            strokeWidth="8"
          />
        </svg>
      );
    case 'documents':
      return (
        <svg
          className={iconClassName}
          width="108"
          height="91"
          viewBox="0 0 108 91"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            className={styles.strokePath}
            x="3"
            y="22"
            width="102"
            height="66"
            strokeWidth="6"
          />
          <path
            className={styles.strokePath}
            d="M12 23L22.3226 3H41.6774L52 23"
            strokeWidth="6"
          />
        </svg>
      );
    case 'settings':
      return (
        <svg
          className={isActive ? styles.activeSettingsIcon : styles.settingsIcon}
          width="103"
          height="103"
          viewBox="0 0 103 103"
          fill="var(--main)"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className={styles.fillPath}
            d="M93 52C93 74.6437 74.6437 93 52 93C29.3563 93 11 74.6437 11 52C11 29.3563 29.3563 11 52 11C74.6437 11 93 29.3563 93 52Z"
          />
          <path className={styles.fillPath} d="M45 0H59V21H45V0Z" />
          <path className={styles.fillPath} d="M103 45V59H82V45H103Z" />
          <path
            className={styles.fillPath}
            d="M92.7316 83.832L82.8321 93.7315L67.9828 78.8823L77.8823 68.9828L92.7316 83.832Z"
          />
          <path
            className={styles.fillPath}
            d="M83.832 11L93.7315 20.8995L78.8823 35.7487L68.9828 25.8492L83.832 11Z"
          />
          <path className={styles.fillPath} d="M45 82H59V103H45V82Z" />
          <path
            className={styles.fillPath}
            d="M21 45V59H1.66948e-07L0 45H21Z"
          />
          <path
            className={styles.fillPath}
            d="M34.7488 25.8492L24.8493 35.7487L10 20.8995L19.8995 11L34.7488 25.8492Z"
          />
          <path
            className={styles.fillPath}
            d="M25.8492 68.9828L35.7487 78.8823L20.8995 93.7315L11 83.832L25.8492 68.9828Z"
          />
        </svg>
      );
    case 'interface':
    default:
      return (
        <svg
          className={iconClassName}
          width="114"
          height="106"
          viewBox="0 0 114 106"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className={styles.strokePath}
            d="M79.2315 89L63.9076 62.3792L94.5553 62.3792L79.2315 89Z"
          />
          <path
            className={styles.strokePath}
            d="M8 4H4V8V65.3371V69.3371H8H63.2975L75.7648 90.9955L79.2315 97.0179L82.6982 90.9955L95.1655 69.3371H106H110V65.3371V8V4H106H8Z"
            strokeWidth="8"
          />
        </svg>
      );
  }
}
