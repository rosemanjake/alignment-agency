import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import type { Document } from '../../lib/documents';

export const DOCUMENTS = loadAvailableDocuments();

interface ParsedDocument {
  scenario: string;
  title: string;
  documentContent: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    res.status(200).json(DOCUMENTS);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res
      .status(500)
      .json({ message: 'Error fetching documents', error: errorMessage });
  }
}

function loadAvailableDocuments(): Document[] {
  const documentsDir = path.join(process.cwd(), 'documents');
  const fileNames = fs
    .readdirSync(documentsDir)
    .filter((fileName) => fileName.endsWith('.md'));

  return fileNames.map((fileName) => {
    const filePath = path.join(documentsDir, fileName);
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { scenario, title, documentContent } =
      parseDocumentContent(rawContent);

    return {
      title,
      scenario,
      content: documentContent,
    };
  });
}

function parseDocumentContent(rawContent: string): ParsedDocument {
  const lines = rawContent.split('\n');
  let scenario = '';
  let title = '';
  let documentContent = '';
  let isParsingHeader = true;

  for (const line of lines) {
    if (isParsingHeader) {
      if (line.startsWith('scenario:')) {
        scenario = line.slice('scenario:'.length).trim();
      } else if (line.startsWith('title:')) {
        title = line.slice('title:'.length).trim();
      } else if (line.trim() === '') {
        isParsingHeader = false;
      }
    } else {
      documentContent += `${line}\n`;
    }
  }

  return {
    scenario,
    title,
    documentContent: documentContent.trim(),
  };
}
