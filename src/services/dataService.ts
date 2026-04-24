import Papa from 'papaparse';
import type { Question } from '../types';

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vShvKIJTIl4eJOPpxmSbQEKNZJR06HBaeSUE1SMnQ-nQxCmYb6X2HiiVBdYC8qQC0-xYKoqBcEzCHur/pub?output=csv';

export async function fetchQuestions(): Promise<Question[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const questions: Question[] = (results.data as any[]).map((row) => {
          const chapterOrderRaw =
            row['chapter_order'] ?? row['chapterOrder'] ?? '';
          const chapterOrder = Number(chapterOrderRaw);
          return {
            subject: row['subject'] || '',
            topic: row['类别'] || '',
            question: row['题目'] || '',
            optionA: row['选项A'] || '',
            optionB: row['选项B'] || '',
            optionC: row['选项C'] || '',
            optionD: row['选项D'] || '',
            answer: row['answer'] || '',
            explanation: row['explanation'] || '',
            chapterOrder: Number.isFinite(chapterOrder)
              ? chapterOrder
              : undefined,
          } as Question;
        });
        resolve(questions);
      },
      error: (error) => reject(error),
    });
  });
}
