'use server';

/**
 * @fileOverview An AI interview coach that generates personalized interview questions based on a resume and job title.
 *
 * - generateInterviewQuestions - A function that generates interview questions.
 * - AiInterviewCoachInput - The input type for the generateInterviewQuestions function.
 * - AiInterviewCoachOutput - The return type for the generateInterviewQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiInterviewCoachInputSchema = z.object({
  resumeText: z.string().describe('The text content of the user\'s resume.'),
  jobTitle: z.string().describe('The job title the user is interviewing for.'),
});
export type AiInterviewCoachInput = z.infer<typeof AiInterviewCoachInputSchema>;

const AiInterviewCoachOutputSchema = z.object({
  behavioralQuestions: z.array(z.string()).describe('An array of behavioral interview questions.'),
  technicalQuestions: z.array(z.string()).describe('An array of technical interview questions.'),
  roleSpecificQuestions: z.array(z.string()).describe('An array of role-specific interview questions.'),
});
export type AiInterviewCoachOutput = z.infer<typeof AiInterviewCoachOutputSchema>;

export async function generateInterviewQuestions(input: AiInterviewCoachInput): Promise<AiInterviewCoachOutput> {
  return aiInterviewCoachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiInterviewCoachPrompt',
  input: {schema: AiInterviewCoachInputSchema},
  output: {schema: AiInterviewCoachOutputSchema},
  prompt: `You are an AI interview coach. Generate interview questions based on the provided resume and job title.

Resume:
{{resumeText}}

Job Title:
{{jobTitle}}

Generate 5 behavioral questions, 5 technical questions, and 5 role-specific questions.

Output the questions in the following JSON format:
{
  "behavioralQuestions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "technicalQuestions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "roleSpecificQuestions": ["question 1", "question 2", "question 3", "question 4", "question 5"]
}`,
});

const aiInterviewCoachFlow = ai.defineFlow(
  {
    name: 'aiInterviewCoachFlow',
    inputSchema: AiInterviewCoachInputSchema,
    outputSchema: AiInterviewCoachOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
