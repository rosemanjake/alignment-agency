export interface Document {
  title: string;
  scenario: string;
  content: string;
}

export function getRelevantDocsJson(
  documents: Document[],
  aiName: string
): string {
  const relevantDocuments = documents.filter(
    (doc) => doc.scenario === aiName || doc.scenario === 'all'
  );
  return JSON.stringify(relevantDocuments);
}
