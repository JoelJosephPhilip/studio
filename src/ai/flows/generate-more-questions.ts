'use server';
/**
 * @fileOverview A flow to generate additional interview questions for a specific category.
 *
 * - generateMoreQuestions - Generates more interview questions.
 * - GenerateMoreQuestionsInput - The input type for the function.
 * - GenerateMoreQuestionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { QuestionAnswerPairSchema, McqQuestionSchema } from '@/ai/schemas/ai-interview-coach-schemas';

export const GenerateMoreQuestionsInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  jobTitle: z.string().describe('The job title the user is interviewing for.'),
  jobDescription: z.string().optional().describe('The job description for the role.'),
  category: z.enum(['behavioral', 'technical', 'mcq']).describe('The category of questions to generate.'),
  existingQuestions: z.array(z.string()).describe('A list of questions already generated to avoid duplicates.'),
});
export type GenerateMoreQuestionsInput = z.infer<typeof GenerateMoreQuestionsInputSchema>;

export const GenerateMoreQuestionsOutputSchema = z.object({
    behavioral: z.array(QuestionAnswerPairSchema).optional(),
    technical: z.array(QuestionAnswerPairSchema).optional(),
    mcqs: z.array(McqQuestionSchema).optional(),
});
export type GenerateMoreQuestionsOutput = z.infer<typeof GenerateMoreQuestionsOutputSchema>;


export async function generateMoreQuestions(input: GenerateMoreQuestionsInput): Promise<GenerateMoreQuestionsOutput> {
  return generateMoreQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMoreQuestionsPrompt',
  input: { schema: GenerateMoreQuestionsInputSchema },
  output: { schema: GenerateMoreQuestionsOutputSchema },
  prompt: `You are an expert career coach and interviewer for the role of {{{jobTitle}}}.

Your task is to generate 2 more unique interview questions for the specified category: '{{{category}}}'.

**Crucially, you must not repeat any of the following questions that have already been generated:**
---
{{#each existingQuestions}}
- {{{this}}}
{{/each}}
---

Here is the user's resume for context:
---
{{{resumeText}}}
---
{{#if jobDescription}}
Here is the job description for context:
---
{{{jobDescription}}}
---
{{/if}}

Based on the category '{{{category}}}', perform ONLY ONE of the following tasks:
- If '{{{category}}}' is 'behavioral', generate 2 insightful behavioral questions and strong sample answers.
- If '{{{category}}}' is 'technical', generate 2 role-specific technical/situational questions and strong sample answers.
- If '{{{category}}}' is 'mcq', generate 2 multiple-choice questions (MCQs), each with 4 distinct options and a correct answer.

Return the new questions as a single, structured JSON object. The JSON key must match the category (e.g., "behavioral", "technical", or "mcqs").
`,
});

const generateMoreQuestionsFlow = ai.defineFlow(
  {
    name: 'generateMoreQuestionsFlow',
    inputSchema: GenerateMoreQuestionsInputSchema,
    outputSchema: GenerateMoreQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
