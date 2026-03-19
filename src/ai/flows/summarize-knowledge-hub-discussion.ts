'use server';
/**
 * @fileOverview An AI agent that summarizes lengthy discussion threads in the Knowledge Hub forum.
 *
 * - summarizeKnowledgeHubDiscussion - A function that handles the discussion summarization process.
 * - KnowledgeHubDiscussionInput - The input type for the summarizeKnowledgeHubDiscussion function.
 * - KnowledgeHubDiscussionOutput - The return type for the summarizeKnowledgeHubDiscussion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const KnowledgeHubDiscussionInputSchema = z.object({
  discussionThreadContent: z
    .string()
    .describe('The full content of the discussion thread to be summarized.'),
});
export type KnowledgeHubDiscussionInput = z.infer<
  typeof KnowledgeHubDiscussionInputSchema
>;

const KnowledgeHubDiscussionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the discussion thread.'),
});
export type KnowledgeHubDiscussionOutput = z.infer<
  typeof KnowledgeHubDiscussionOutputSchema
>;

export async function summarizeKnowledgeHubDiscussion(
  input: KnowledgeHubDiscussionInput
): Promise<KnowledgeHubDiscussionOutput> {
  return summarizeKnowledgeHubDiscussionFlow(input);
}

const summarizeKnowledgeHubDiscussionPrompt = ai.definePrompt({
  name: 'summarizeKnowledgeHubDiscussionPrompt',
  input: { schema: KnowledgeHubDiscussionInputSchema },
  output: { schema: KnowledgeHubDiscussionOutputSchema },
  prompt: `Please provide a concise summary of the following discussion thread. Your summary should highlight the main topics, key arguments, and significant insights or conclusions presented in the discussion.

Discussion Thread:
{{{discussionThreadContent}}}`,
});

const summarizeKnowledgeHubDiscussionFlow = ai.defineFlow(
  {
    name: 'summarizeKnowledgeHubDiscussionFlow',
    inputSchema: KnowledgeHubDiscussionInputSchema,
    outputSchema: KnowledgeHubDiscussionOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeKnowledgeHubDiscussionPrompt(input);
    return output!;
  }
);
