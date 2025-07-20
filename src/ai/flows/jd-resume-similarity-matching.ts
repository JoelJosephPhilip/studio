// This is an AI-powered tool that provides a similarity score between a resume and a job description.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JdResumeSimilarityMatchingInputSchema = z.object({
  resume: z.string().describe('The content of the resume.'),
  jobDescription: z.string().describe('The content of the job description.'),
});
export type JdResumeSimilarityMatchingInput = z.infer<
  typeof JdResumeSimilarityMatchingInputSchema
>;

const JdResumeSimilarityMatchingOutputSchema = z.object({
  similarityScore: z
    .number()
    .describe(
      'A score between 0 and 1 indicating the similarity between the resume and the job description. Higher scores indicate greater similarity.'
    ),
  suggestions: z
    .string()
    .describe(
      'Personalized suggestions on how to improve the resume to better match the job description.'
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
  prompt: `You are an expert career coach. Your task is to compare a resume against a job description and provide a similarity score and suggestions for improvement.

  Analyze the resume and job description to identify matching skills, keywords, and experiences. Provide a similarity score between 0 and 1, where 1 indicates a perfect match.

  In addition to the similarity score, provide personalized suggestions on how the candidate can improve their resume to better align with the requirements of the job description.

  Here is the resume:
  {{resume}}

  Here is the job description:
  {{jobDescription}}

  Respond with a JSON object:
  { 
    similarityScore: number,
    suggestions: string
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
