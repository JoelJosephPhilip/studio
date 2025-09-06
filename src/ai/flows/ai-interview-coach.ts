'use server';

/**
 * @fileOverview An AI interview coach that generates a personalized "prep pack" with questions, answers, and feedback.
 *
 * - generateInterviewPrepPack - Generates interview questions, sample answers, and feedback.
 * - AiInterviewCoachInput - The input type for the function.
 * - AiInterviewCoachOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiInterviewCoachInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  jobTitle: z.string().describe('The job title the user is interviewing for.'),
});
export type AiInterviewCoachInput = z.infer<typeof AiInterviewCoachInputSchema>;

const QuestionAnswerPairSchema = z.object({
    question: z.string().describe("The interview question."),
    sampleAnswer: z.string().describe("A strong, sample answer to the question."),
});

const FeedbackSchema = z.object({
    strengths: z.array(z.string()).describe("A list of key strengths based on the resume for this role."),
    areasForImprovement: z.array(z.string()).describe("A list of potential weak spots or areas to prepare for."),
});

const AiInterviewCoachOutputSchema = z.object({
  behavioral: z.array(QuestionAnswerPairSchema).describe('An array of behavioral interview questions and answers.'),
  technical: z.array(QuestionAnswerPairSchema).describe('An array of technical/situational interview questions and answers.'),
  feedback: FeedbackSchema.describe("A summary of strengths and areas for improvement."),
});
export type AiInterviewCoachOutput = z.infer<typeof AiInterviewCoachOutputSchema>;

export async function generateInterviewPrepPack(input: AiInterviewCoachInput): Promise<AiInterviewCoachOutput> {
  return aiInterviewCoachFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiInterviewCoachPrompt',
  input: {schema: AiInterviewCoachInputSchema},
  output: {schema: AiInterviewCoachOutputSchema},
  prompt: `You are an expert career coach and interviewer for the role of {{{jobTitle}}}.

Your task is to create an "Interview Prep Pack" based on the user's resume.

Here is the user's resume:
---
{{{resumeText}}}
---

Based on the resume and the job title '{{{jobTitle}}}', please perform the following:
1.  Generate 5 insightful behavioral interview questions that an interviewer would likely ask.
2.  Generate 5 role-specific technical or situational questions.
3.  For EACH of the 10 questions, provide a strong, detailed sample answer that the user could use as inspiration. The answers should subtly incorporate strengths and experiences from the provided resume.
4.  Provide a summary of feedback, including 3 key strengths to highlight during the interview and 3 potential areas for improvement or topics the user should be prepared to address.

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
