'use server';

/**
 * @fileOverview An AI interview coach that generates a personalized "prep pack" with questions, answers, and feedback.
 *
 * - generateInterviewPrepPack - Generates interview questions, sample answers, and feedback.
 */

import {ai} from '@/ai/genkit';
import {
    AiInterviewCoachInputSchema,
    AiInterviewCoachOutputSchema,
    type AiInterviewCoachInput,
    type AiInterviewCoachOutput
} from '@/ai/schemas/ai-interview-coach-schemas';


export async function generateInterviewPrepPack(input: AiInterviewCoachInput): Promise<AiInterviewCoachOutput> {
  return aiInterviewCoachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiInterviewCoachPrompt',
  input: {schema: AiInterviewCoachInputSchema},
  output: {schema: AiInterviewCoachOutputSchema},
  prompt: `You are an expert career coach and interviewer for the role of {{{jobTitle}}}.

Your task is to create an "Interview Prep Pack" based on the user's resume and, if provided, the job description.

Here is the user's resume:
---
{{{resumeText}}}
---
{{#if jobDescription}}
Here is the job description:
---
{{{jobDescription}}}
---
{{/if}}

Based on the provided information, please perform the following:
1.  Generate 3 insightful behavioral interview questions that an interviewer would likely ask.
2.  Generate 3 role-specific technical or situational questions, tailored to the job description if available.
3.  For EACH of the 6 questions above, provide a strong, detailed sample answer that the user could use as inspiration. The answers should subtly incorporate strengths and experiences from the provided resume.
4.  Generate 3 multiple-choice questions (MCQs) relevant to the role, each with 4 distinct options and a clearly identified correct answer.
5.  Provide a summary of feedback, including 3 key strengths to highlight during the interview and 3 potential areas for improvement or topics the user should be prepared to address.

Return the entire prep pack as a single, structured JSON object that strictly follows the provided output schema.`,
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
