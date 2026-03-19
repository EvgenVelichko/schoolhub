
'use server';
/**
 * @fileOverview AI flow to parse raw HTML from nz.ua into structured school data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseNzHtmlInputSchema = z.object({
  html: z.string().describe('The raw HTML content from nz.ua journal or dashboard page.'),
});

const ParseNzHtmlOutputSchema = z.object({
  studentName: z.string().describe('Full name of the student found in the HTML.'),
  gradeLevel: z.string().describe('The class/grade level (e.g., "11-B").'),
  grades: z.array(z.object({
    subject: z.string(),
    score: z.number(),
    date: z.string().describe('ISO date string.'),
    type: z.string().describe('Type of work (e.g., "КР", "ДЗ").')
  })).describe('List of recent grades.'),
  lessons: z.array(z.object({
    subject: z.string(),
    time: z.string(),
    room: z.string(),
    teacher: z.string()
  })).describe('Today\'s or next day\'s schedule.')
});

export type ParseNzHtmlOutput = z.infer<typeof ParseNzHtmlOutputSchema>;

export async function parseNzHtml(input: { html: string }): Promise<ParseNzHtmlOutput> {
  return parseNzHtmlFlow(input);
}

const parseNzHtmlPrompt = ai.definePrompt({
  name: 'parseNzHtmlPrompt',
  input: { schema: ParseNzHtmlInputSchema },
  output: { schema: ParseNzHtmlOutputSchema },
  prompt: `Ви — спеціаліст із вилучення даних. Ваше завдання — проаналізувати наданий HTML-код із порталу nz.ua (Нові Знання) та перетворити його на структурований JSON.

Знайдіть у коді:
1. ПІБ учня.
2. Клас (наприклад, 10-А).
3. Останні оцінки з таблиці успішності (предмет, бал, дата, тип роботи).
4. Розклад уроків, якщо він є на сторінці.

HTML-код для аналізу:
{{{html}}}

Важливо: Якщо якісь дані відсутні, заповніть їх порожніми масивами або логічними значеннями за замовчуванням. Використовуйте тільки українську мову для текстових значень.`,
});

const parseNzHtmlFlow = ai.defineFlow(
  {
    name: 'parseNzHtmlFlow',
    inputSchema: ParseNzHtmlInputSchema,
    outputSchema: ParseNzHtmlOutputSchema,
  },
  async (input) => {
    const { output } = await parseNzHtmlPrompt(input);
    if (!output) throw new Error('AI failed to parse HTML');
    return output;
  }
);
