
'use server';

/**
 * @fileOverview An AI-powered tool that provides a similarity score and detailed analysis
 * between a resume and a job description. Adapted for the Job Search Aggregator feature.
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
  matches: z.array(z.string()).describe('A list of the top 5 matching keywords or skills from the resume.'),
  gaps: z.array(z.string()).describe('A list of the top 5 missing or weak skills from the resume.'),
  summary: z
    .string()
    .describe(
      'A 2-3 sentence summary explaining why the candidate is a good fit.'
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
  2. List the top 5 most important keywords or skills from the job description that are present in the resume.
  3. List the top 5 most important keywords or skills from the job description that are missing from the resume.
  4. Provide a 2-3 sentence summary explaining why the candidate is a good fit for the role, based on their resume.

  Return your analysis in the specified structured JSON format.
  `,
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
