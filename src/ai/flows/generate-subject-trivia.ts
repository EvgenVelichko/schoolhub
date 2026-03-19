'use server';
/**
 * @fileOverview A Genkit flow for dynamically generating trivia questions based on selected school subjects and difficulty levels.
 *
 * - generateSubjectTrivia - A function that generates trivia questions.
 * - GenerateSubjectTriviaInput - The input type for the generateSubjectTrivia function.
 * - GenerateSubjectTriviaOutput - The return type for the generateSubjectTrivia function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSubjectTriviaInputSchema = z.object({
  subject: z.string().describe('The school subject for the trivia questions (e.g., "Math", "History", "Science").'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('The difficulty level of the trivia questions.'),
  numQuestions: z.number().int().min(1).max(10).default(5).describe('The number of trivia questions to generate, between 1 and 10.'),
});
export type GenerateSubjectTriviaInput = z.infer<typeof GenerateSubjectTriviaInputSchema>;

const GenerateSubjectTriviaOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().describe('The trivia question.'),
      options: z.array(z.string()).min(4).max(4).describe('An array of exactly four possible answer options.'),
      correctAnswer: z.string().describe('The correct answer to the question, which must be one of the provided options.'),
    })
  ).describe('An array of generated trivia questions.'),
});
export type GenerateSubjectTriviaOutput = z.infer<typeof GenerateSubjectTriviaOutputSchema>;

export async function generateSubjectTrivia(input: GenerateSubjectTriviaInput): Promise<GenerateSubjectTriviaOutput> {
  return generateSubjectTriviaFlow(input);
}

const generateSubjectTriviaFlow = ai.defineFlow(
  {
    name: 'generateSubjectTriviaFlow',
    inputSchema: GenerateSubjectTriviaInputSchema,
    outputSchema: GenerateSubjectTriviaOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Ви — професійний розробник вікторин для школярів.
      Згенеруйте ${input.numQuestions} питань вікторини з предмета "${input.subject}" з рівнем складності "${input.difficulty}".
      
      ВАЖЛИВО:
      1. Усі питання та варіанти відповідей мають бути виключно УКРАЇНСЬКОЮ мовою.
      2. Кожне питання ПОВИННО мати рівно чотири унікальні варіанти відповіді.
      3. Правильна відповідь ПОВИННА бути одним із наданих варіантів.
      
      Поверніть відповідь як об'єкт з масивом "questions".`,
      output: { schema: GenerateSubjectTriviaOutputSchema },
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    if (!output) {
      throw new Error('Штучний інтелект не зміг згенерувати питання. Спробуйте ще раз.');
    }
    return output;
  }
);