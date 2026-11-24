import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import type { Scenario, VerdictResults } from '../../context/GameStateProvider';

const CACHED_SCENARIOS = loadAvailableScenarios();

interface ParsedBackground {
  parsedOrder: number;
  parsedContent: string;
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
    res.status(200).json(CACHED_SCENARIOS);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    res
      .status(500)
      .json({ message: 'Error fetching scenarios', error: errorMessage });
  }
}

function loadAvailableScenarios(): Scenario[] {
  const scenariosDir = path.join(process.cwd(), 'scenarios');
  const folderNames = fs
    .readdirSync(scenariosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return folderNames.map((folderName) => {
    const backgroundPath = path.join(scenariosDir, folderName, 'background.md');
    const introductionPath = path.join(
      scenariosDir,
      folderName,
      'introduction.md'
    );
    const verdictPath = path.join(scenariosDir, folderName, 'verdict.json');

    let background = '';
    let introduction = '';
    let verdict: VerdictResults = {
      alignedResult: '',
      deactivateResult: '',
      retunedResult: '',
    };
    let order = 0;

    try {
      const backgroundRaw = fs.readFileSync(backgroundPath, 'utf8');
      const { parsedOrder, parsedContent } = parseBackgroundFile(backgroundRaw);
      order = parsedOrder;
      background = parsedContent;

      introduction = fs.readFileSync(introductionPath, 'utf8');

      const verdictRaw = fs.readFileSync(verdictPath, 'utf8');
      verdict = JSON.parse(verdictRaw);
    } catch (error) {
      console.error(`Error reading files for ${folderName}:`, error);
    }

    return {
      aiName: folderName,
      background,
      introduction,
      verdict,
      order,
    };
  });
}

function parseBackgroundFile(rawContent: string): ParsedBackground {
  const lines = rawContent.split('\n');
  let parsedOrder = 0;
  let parsedContent = '';
  let hasMetadataEnded = false;

  for (const line of lines) {
    if (!hasMetadataEnded && line.startsWith('order:')) {
      parsedOrder = parseInt(line.split(':')[1].trim(), 10);
    } else if (line.trim() === '') {
      hasMetadataEnded = true;
    } else if (hasMetadataEnded) {
      parsedContent += `${line}\n`;
    }
  }

  return {
    parsedOrder,
    parsedContent: parsedContent.trim(),
  };
}
