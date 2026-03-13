export interface NormalizedRecord {
  [key: string]: any;
}

export interface NormalizedDocument {
  title: string;
  sourceType: 'csv' | 'json' | 'markdown' | 'code' | 'api';
  metadata: Record<string, any>;
  schema: string[]; // Inferred fields/keys
  records: NormalizedRecord[]; // Structured data extracted from the source
  textContent: string; // Clean, stringified representation optimized for LLM context
}

export function normalizeCSV(filename: string, parsedData: any[], rawContent: string): NormalizedDocument {
  const records = parsedData || [];
  const schema = records.length > 0 ? Object.keys(records[0]) : [];
  
  // Create a readable text representation for the LLM
  // We limit the raw preview to avoid blowing up the context window with massive CSVs
  const previewLines = rawContent.split('\n').slice(0, 50).join('\n');
  const textContent = `[DATASET: ${filename}]\nType: CSV\nColumns: ${schema.join(', ')}\nTotal Records: ${records.length}\n\nData Preview (First 50 lines):\n${previewLines}\n[END DATASET]`;

  return {
    title: filename,
    sourceType: 'csv',
    metadata: { rowCount: records.length, columns: schema.length },
    schema,
    records,
    textContent
  };
}

export function normalizeJSON(filename: string, parsedData: any, rawContent: string): NormalizedDocument {
  let records: any[] = [];
  let schema: string[] = [];

  if (Array.isArray(parsedData)) {
    records = parsedData;
    schema = records.length > 0 && typeof records[0] === 'object' && records[0] !== null ? Object.keys(records[0]) : [];
  } else if (typeof parsedData === 'object' && parsedData !== null) {
    records = [parsedData];
    schema = Object.keys(parsedData);
  }

  // Truncate massive JSON files for the LLM context, but keep structure
  const stringified = JSON.stringify(parsedData, null, 2);
  const truncated = stringified.length > 5000 ? stringified.slice(0, 5000) + '\n... [TRUNCATED FOR CONTEXT]' : stringified;
  
  const textContent = `[DATASET: ${filename}]\nType: JSON\nSchema/Keys: ${schema.join(', ')}\nIs Array: ${Array.isArray(parsedData)}\nTotal Records: ${records.length}\n\nContent Preview:\n${truncated}\n[END DATASET]`;

  return {
    title: filename,
    sourceType: 'json',
    metadata: { isArray: Array.isArray(parsedData), rootKeys: schema, recordCount: records.length },
    schema,
    records,
    textContent
  };
}

export function normalizeMarkdown(filename: string, rawContent: string): NormalizedDocument {
  // Basic frontmatter extraction to normalize metadata
  let metadata: Record<string, any> = {};
  let content = rawContent;
  let schema: string[] = [];

  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);
  
  if (match) {
    const fmText = match[1];
    content = match[2];
    fmText.split('\n').forEach(line => {
      const [key, ...val] = line.split(':');
      if (key && val.length) {
        const cleanKey = key.trim();
        metadata[cleanKey] = val.join(':').trim();
        schema.push(cleanKey);
      }
    });
  }

  const textContent = `[DOCUMENT: ${filename}]\nType: Markdown\nMetadata: ${JSON.stringify(metadata)}\n\nContent:\n${content}\n[END DOCUMENT]`;

  return {
    title: filename,
    sourceType: 'markdown',
    metadata,
    schema,
    records: [], // Markdown typically lacks tabular records unless specifically parsed
    textContent
  };
}

export function normalizeCode(filename: string, rawContent: string): NormalizedDocument {
  const extension = filename.split('.').pop() || 'txt';
  const lineCount = rawContent.split('\n').length;
  
  const textContent = `[SOURCE CODE: ${filename}]\nLanguage: ${extension}\nLines: ${lineCount}\n\nContent:\n${rawContent}\n[END SOURCE CODE]`;

  return {
    title: filename,
    sourceType: 'code',
    metadata: { language: extension, lines: lineCount },
    schema: [],
    records: [],
    textContent
  };
}
