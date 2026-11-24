import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGameState, type Scenario } from '../context/GameStateProvider';
import type { Document } from '../lib/documents';
import styles from '../styles/Documents.module.css';
import CustomButton from './CustomButton';

interface GroupedDocuments {
  scenarioDocuments: Document[];
  generalDocuments: Document[];
  caseFile: Document | null;
}

export default function DocumentsPage() {
  const { currentDocuments, currentScenario } = useGameState();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );

  const { scenarioDocuments, generalDocuments, caseFile } = useMemo(
    () => groupDocumentsForScenario(currentDocuments, currentScenario),
    [currentDocuments, currentScenario]
  );

  useEffect(() => {
    setSelectedDocument(null);
  }, [currentScenario]);

  if (selectedDocument) {
    return (
      <>
        <CustomButton onClick={() => setSelectedDocument(null)}>
          Back to documents
        </CustomButton>
        <div className={styles.documentView}>
          <h2>{selectedDocument.title}</h2>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {selectedDocument.content}
          </ReactMarkdown>
        </div>
      </>
    );
  }

  const hasAnyDocuments =
    Boolean(caseFile) ||
    scenarioDocuments.length > 0 ||
    generalDocuments.length > 0;

  return (
    <div className={styles.documentList}>
      <h2>
        Available Documents for {currentScenario?.aiName || 'Current Scenario'}
      </h2>
      {!hasAnyDocuments ? (
        <p>No documents available for this scenario.</p>
      ) : (
        <>
          {caseFile && (
            <div>
              <h3>Case file</h3>
              <ul className={styles.documents}>
                <CustomButton
                  key="casefile"
                  onClick={() => setSelectedDocument(caseFile)}
                  fullWidth={true}
                >
                  {caseFile.title}
                </CustomButton>
              </ul>
            </div>
          )}
          {scenarioDocuments.length > 0 && (
            <div>
              <h3>Scenario-specific Documents</h3>
              <ul className={styles.documents}>
                {scenarioDocuments.map((doc, index) => (
                  <CustomButton
                    key={`scenario-${index}`}
                    onClick={() => setSelectedDocument(doc)}
                    fullWidth={true}
                  >
                    {doc.title}
                  </CustomButton>
                ))}
              </ul>
            </div>
          )}
          {generalDocuments.length > 0 && (
            <div>
              <h3>General Documents</h3>
              <ul className={styles.documents}>
                {generalDocuments.map((doc, index) => (
                  <CustomButton
                    key={`general-${index}`}
                    onClick={() => setSelectedDocument(doc)}
                    fullWidth={true}
                  >
                    {doc.title}
                  </CustomButton>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function groupDocumentsForScenario(
  documents: Document[],
  currentScenario: Scenario | null
): GroupedDocuments {
  if (!currentScenario) {
    return { scenarioDocuments: [], generalDocuments: [], caseFile: null };
  }

  const scenarioDocuments = documents.filter(
    (doc) => doc.scenario === currentScenario.aiName
  );
  const generalDocuments = documents.filter((doc) => doc.scenario === 'all');
  const caseFile: Document = {
    title: `Case file - ${currentScenario.aiName}`,
    scenario: currentScenario.aiName,
    content: currentScenario.background.replace(/## Truth.*/s, ''),
  };

  return { scenarioDocuments, generalDocuments, caseFile };
}
