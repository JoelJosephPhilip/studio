'use server';
/**
 * @fileOverview A flow to generate multiple-choice questions for a specific technology topic.
 *
 * - generateMcqsForTopic - Generates MCQs for a given topic.
 */

import { ai } from '@/ai/genkit';
import {
    GenerateMcqsForTopicInputSchema,
    GenerateMcqsForTopicOutputSchema,
    type GenerateMcqsForTopicInput,
    type GenerateMcqsForTopicOutput
} from '@/ai/schemas/ai-interview-coach-schemas';

export async function generateMcqsForTopic(input: GenerateMcqsForTopicInput): Promise<GenerateMcqsForTopicOutput> {
  return generateMcqsForTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMcqsForTopicPrompt',
  input: { schema: GenerateMcqsForTopicInputSchema },
  output: { schema: GenerateMcqsForTopicOutputSchema },
  prompt: `You are an expert technical interviewer.

Your task is to generate 3 unique and relevant multiple-choice questions (MCQs) for the specified technology topic: '{{{topic}}}'.

Each MCQ should have 4 distinct options and a clearly identified correct answer.

**Crucially, you must not repeat any of the following questions that have already been generated:**
---
{{#each existingQuestions}}
- {{{this}}}
{{/each}}
---

Return the new questions as a single, structured JSON object containing an array of MCQs.
`,
});

const generateMcqsForTopicFlow = ai.defineFlow(
  {
    name: 'generateMcqsForTopicFlow',
    inputSchema: GenerateMcqsForTopicInputSchema,
    outputSchema: GenerateMcqsForTopicOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
