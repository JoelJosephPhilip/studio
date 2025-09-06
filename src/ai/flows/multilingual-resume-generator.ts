'use server';

/**
 * @fileOverview A multilingual resume generator AI agent.
 *
 * - multilingualResumeGenerator - A function that handles the resume translation process.
 * - MultilingualResumeGeneratorInput - The input type for the multilingualResumeGenerator function.
 * - MultilingualResumeGeneratorOutput - The return type for the multilingualResumeGenerator function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MultilingualResumeGeneratorInputSchema = z.object({
  resumeText: z.string().describe('The text of the resume to be translated.'),
  targetLanguage: z
    .string()
    .describe('The language to which the resume should be translated (e.g., "Spanish", "German").'),
});
export type MultilingualResumeGeneratorInput = z.infer<
  typeof MultilingualResumeGeneratorInputSchema
>;

const MultilingualResumeGeneratorOutputSchema = z.object({
  translatedResume: z.string().describe('The translated and localized resume text.'),
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
  prompt: `You are a multilingual resume consultant and localization expert. Your task is to translate and localize a user's resume for a specific job market.

Here is the user’s resume content:
---
{{{resumeText}}}
---

Target Language: {{{targetLanguage}}}

Your tasks are:
1. Translate the entire resume into the target language, ensuring the tone remains professional and ATS-friendly.
2. Localize the content: Adjust common job titles to their equivalents in the target market, format dates according to local conventions (e.g., DD/MM/YYYY), and ensure all content is culturally appropriate.
3. Optimize keywords for ATS effectiveness in the target language. Translate the concepts and skills, not just the literal words.
4. Return the complete, translated resume as a single block of text.
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
