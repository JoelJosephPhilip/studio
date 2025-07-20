// 'use server';

/**
 * @fileOverview A multilingual resume generator AI agent.
 *
 * - multilingualResumeGenerator - A function that handles the resume translation process.
 * - MultilingualResumeGeneratorInput - The input type for the multilingualResumeGenerator function.
 * - MultilingualResumeGeneratorOutput - The return type for the multilingualResumeGenerator function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MultilingualResumeGeneratorInputSchema = z.object({
  resumeText: z.string().describe('The text of the resume to be translated.'),
  targetLanguage: z
    .string()
    .describe('The language to which the resume should be translated.'),
});
export type MultilingualResumeGeneratorInput = z.infer<
  typeof MultilingualResumeGeneratorInputSchema
>;

const MultilingualResumeGeneratorOutputSchema = z.object({
  translatedResume: z.string().describe('The translated resume in the target language.'),
});
export type MultilingualResumeGeneratorOutput = z.infer<
  typeof MultilingualResumeGeneratorOutputSchema
>;

export async function multilingualResumeGenerator(
  input: MultilingualResumeGeneratorInput
): Promise<MultilingualResumeGeneratorOutput> {
  return multilingualResumeGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'multilingualResumeGeneratorPrompt',
  input: {schema: MultilingualResumeGeneratorInputSchema},
  output: {schema: MultilingualResumeGeneratorOutputSchema},
  prompt: `You are a professional translator specializing in resumes.

  Translate the following resume text into the specified target language, ensuring that the translated resume maintains a professional tone and is culturally appropriate for job applications in the target language.

  Resume Text: {{{resumeText}}}
  Target Language: {{{targetLanguage}}}
  `,
});

const multilingualResumeGeneratorFlow = ai.defineFlow(
  {
    name: 'multilingualResumeGeneratorFlow',
    inputSchema: MultilingualResumeGeneratorInputSchema,
    outputSchema: MultilingualResumeGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
