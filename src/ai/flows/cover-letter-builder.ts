'use server';

/**
 * @fileOverview Cover letter generation flow.
 *
 * - generateCoverLetter - A function that generates a cover letter.
 * - GenerateCoverLetterInput - The input type for the generateCoverLetter function.
 * - GenerateCoverLetterOutput - The return type for the generateCoverLetter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCoverLetterInputSchema = z.object({
  resumeText: z
    .string()
    .describe('The resume content to generate the cover letter from.'),
  jobDescription: z
    .string()
    .describe('The job description to tailor the cover letter to.'),
  jobTitle: z.string().describe('The job title for the position.'),
  companyName: z.string().describe('The name of the company.'),
});
export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterInputSchema>;

const GenerateCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated cover letter text.'),
});
export type GenerateCoverLetterOutput = z.infer<typeof GenerateCoverLetterOutputSchema>;

export async function generateCoverLetter(input: GenerateCoverLetterInput): Promise<GenerateCoverLetterOutput> {
  return generateCoverLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'coverLetterPrompt',
  input: {schema: GenerateCoverLetterInputSchema},
  output: {schema: GenerateCoverLetterOutputSchema},
  prompt: `You are a professional career consultant. Your task is to write a personalized, ATS-friendly, professional cover letter for the role of {{{jobTitle}}} at {{{companyName}}}.

Here is the user’s resume content:
---
{{{resumeText}}}
---
Here is the job description:
---
{{{jobDescription}}}
---

Please adhere to the following guidelines:
- Highlight the most relevant experiences from the resume that match the job description.
- Naturally incorporate keywords from the job description.
- Use a confident yet concise and professional tone.
- Structure the letter with: A professional greeting, a strong opening paragraph, 2-3 paragraphs highlighting key achievements and skills, and a clear closing with a call to action.
- Ensure the final output is limited to one page in length.
`,
});

const generateCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateCoverLetterFlow',
    inputSchema: GenerateCoverLetterInputSchema,
    outputSchema: GenerateCoverLetterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
