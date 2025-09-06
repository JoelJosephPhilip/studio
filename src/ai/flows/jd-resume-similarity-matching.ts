'use server';

/**
 * @fileOverview An AI-powered tool that provides a similarity score and detailed analysis
 * between a resume and a job description.
 *
 * - jdResumeSimilarityMatching - A function that handles the resume analysis process.
 * - JdResumeSimilarityMatchingInput - The input type for the analysis function.
 * - JdResumeSimilarityMatchingOutput - The return type for the analysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JdResumeSimilarityMatchingInputSchema = z.object({
  resumeText: z.string().describe('The content of the resume.'),
  jobDescriptionText: z.string().describe('The content of the job description.'),
});
export type JdResumeSimilarityMatchingInput = z.infer<
  typeof JdResumeSimilarityMatchingInputSchema
>;

const JdResumeSimilarityMatchingOutputSchema = z.object({
  score: z
    .number()
    .describe(
      'A similarity score between 0 and 100, where 100 is a perfect match.'
    ),
  keywordGaps: z.array(z.string()).describe('A list of the top 10 missing keywords or skills from the resume.'),
  strengths: z.array(z.string()).describe('A list of 5-10 key strengths from the resume that align with the job description.'),
  suggestions: z
    .array(z.string())
    .describe(
      'Actionable suggestions on how to improve the resume to better match the job description.'
    ),
});
export type JdResumeSimilarityMatchingOutput = z.infer<
  typeof JdResumeSimilarityMatchingOutputSchema
>;

export async function jdResumeSimilarityMatching(
  input: JdResumeSimilarityMatchingInput
): Promise<JdResumeSimilarityMatchingOutput> {
  return jdResumeSimilarityMatchingFlow(input);
}

const jdResumeSimilarityMatchingPrompt = ai.definePrompt({
  name: 'jdResumeSimilarityMatchingPrompt',
  input: {schema: JdResumeSimilarityMatchingInputSchema},
  output: {schema: JdResumeSimilarityMatchingOutputSchema},
  prompt: `You are an expert ATS and career coach AI. Compare the following resume with the job description.

  Resume:
  ---
  {{{resumeText}}}
  ---
  Job Description:
  ---
  {{{jobDescriptionText}}}
  ---

  Your task is to:
  1. Assign a similarity score from 0 to 100 representing how well the resume matches the job description.
  2. List the top 10 most important keywords or skills from the job description that are missing from the resume.
  3. Highlight 5–10 key strengths from the resume that are highly relevant to the job description.
  4. Provide specific, actionable suggestions to rephrase or add content to the resume to make it more aligned with the job description.

  Return your analysis in the following structured JSON format:
  {
    "score": (number from 0-100),
    "keywordGaps": ["Missing keyword 1", "Missing skill 2", ...],
    "strengths": ["Relevant strength 1", "Matching experience 2", ...],
    "suggestions": ["Suggestion 1 to improve resume", "Suggestion 2", ...]
  }`,
});

const jdResumeSimilarityMatchingFlow = ai.defineFlow(
  {
    name: 'jdResumeSimilarityMatchingFlow',
    inputSchema: JdResumeSimilarityMatchingInputSchema,
    outputSchema: JdResumeSimilarityMatchingOutputSchema,
  },
  async input => {
    const {output} = await jdResumeSimilarityMatchingPrompt(input);
    return output!;
  }
);
