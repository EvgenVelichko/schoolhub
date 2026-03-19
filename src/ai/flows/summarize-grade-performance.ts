'use server';
/**
 * @fileOverview An AI agent that summarizes a student's academic performance.
 *
 * - summarizeGradePerformance - A function that handles the academic performance summary process.
 * - AcademicDataInput - The input type for the summarizeGradePerformance function.
 * - PerformanceSummaryOutput - The return type for the summarizeGradePerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeItemSchema = z.object({
  assignmentName: z.string().describe('The name of the assignment or test.'),
  grade: z.number().describe('The score received for the assignment.'),
  maxGrade: z.number().optional().describe('The maximum possible score for the assignment, if applicable.'),
  date: z.string().describe('The date the assignment was graded (YYYY-MM-DD).'),
});

const SubjectPerformanceSchema = z.object({
  name: z.string().describe('The name of the subject (e.g., "Mathematics", "History").'),
  averageGrade: z.number().optional().describe('The current average grade for this subject.'),
  recentGrades: z.array(GradeItemSchema).describe('A list of recent grades for assignments in this subject.'),
});

const AcademicDataInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  subjects: z.array(SubjectPerformanceSchema).describe('A list of subjects and their associated performance data.'),
  overallAverage: z.number().optional().describe('The student\'s overall academic average across all subjects.'),
  recentFeedback: z.string().optional().describe('Any recent qualitative feedback from teachers.'),
});
export type AcademicDataInput = z.infer<typeof AcademicDataInputSchema>;

const PerformanceSummaryOutputSchema = z.object({
  overallSummary: z.string().describe('A comprehensive summary of the student\'s academic performance.'),
  strengths: z.array(z.string()).describe('Key areas where the student is performing well.'),
  areasForImprovement: z.array(z.string()).describe('Specific subjects or skills where the student could improve.'),
  overallTrends: z.string().describe('Observed trends in academic performance (e.g., improving, consistent, declining).'),
  recommendations: z.array(z.string()).describe('Actionable advice for the student to maintain strengths and address areas for improvement.'),
});
export type PerformanceSummaryOutput = z.infer<typeof PerformanceSummaryOutputSchema>;

export async function summarizeGradePerformance(input: AcademicDataInput): Promise<PerformanceSummaryOutput> {
  return summarizeGradePerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeGradePerformancePrompt',
  input: {schema: AcademicDataInputSchema},
  output: {schema: PerformanceSummaryOutputSchema},
  prompt: `You are an experienced and encouraging academic advisor. Your task is to analyze the provided academic data for student {{{studentName}}} and generate a concise summary of their recent academic performance.

Highlight the student's strengths, identify specific areas for improvement, describe overall trends, and provide actionable recommendations.

Here is the student's academic data:

Student Name: {{{studentName}}}
Overall Average: {{{overallAverage}}}

Subjects Performance:
{{#each subjects}}
  Subject: {{{name}}}
  Average Grade: {{{averageGrade}}}
  Recent Grades:
  {{#each recentGrades}}
    - Assignment: {{{assignmentName}}}, Grade: {{{grade}}}{{#if maxGrade}}/{{{maxGrade}}}{{/if}}, Date: {{{date}}}
  {{/each}}
{{/each}}

Recent Feedback: {{{recentFeedback}}}

Please ensure the summary is encouraging, constructive, and provides clear insights. Focus on identifying patterns and offering practical advice.
`,
});

const summarizeGradePerformanceFlow = ai.defineFlow(
  {
    name: 'summarizeGradePerformanceFlow',
    inputSchema: AcademicDataInputSchema,
    outputSchema: PerformanceSummaryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate academic performance summary.');
    }
    return output;
  }
);
