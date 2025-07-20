'use server';

/**
 * @fileOverview A flow to analyze a resume from a PDF file for ATS compliance.
 *
 * - analyzeResumeAtsPdf - A function that handles the resume PDF analysis process.
 * - AnalyzeResumeAtsPdfInput - The input type for the analyzeResumeAtsPdf function.
 * - AnalyzeResumeAtsPdfOutput - The return type for the analyzeResumeAtsPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeResumeAtsPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF of a resume, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type AnalyzeResumeAtsPdfInput = z.infer<
  typeof AnalyzeResumeAtsPdfInputSchema
>;

const AnalyzeResumeAtsPdfOutputSchema = z.object({
  atsReadinessScore: z
    .number()
    .describe(
      'A score indicating the ATS readiness of the resume (0-100, higher is better).'
    ),
  feedback: z
    .string()
    .describe(
      'Detailed feedback on grammar, keyword density, and format compliance.'
    ),
  suggestions: z
    .string()
    .describe('Specific suggestions to improve ATS compliance.'),
});
export type AnalyzeResumeAtsPdfOutput = z.infer<
  typeof AnalyzeResumeAtsPdfOutputSchema
>;

export async function analyzeResumeAtsPdf(
  input: AnalyzeResumeAtsPdfInput
): Promise<AnalyzeResumeAtsPdfOutput> {
  return analyzeResumeAtsPdfFlow(input);
}

const atsAnalysisPdfPrompt = ai.definePrompt({
  name: 'atsAnalysisPdfPrompt',
  input: {schema: AnalyzeResumeAtsPdfInputSchema},
  output: {schema: AnalyzeResumeAtsPdfOutputSchema},
  prompt: `You are an expert resume analyst specializing in Applicant Tracking System (ATS) compliance.

  Extract the text from the following resume PDF. Then, provide a detailed analysis covering the following points:
  1.  **Keyword Optimization**: How well does the resume use relevant keywords?
  2.  **Formatting**: Is the resume format clean, professional, and easy for an ATS to parse?
  3.  **Clarity and Conciseness**: Is the language clear and to the point?
  4.  **Action Verbs**: Does the resume use strong action verbs to describe accomplishments?
  
  Based on your analysis, provide:
  - An overall "ATS Readiness Score" from 0 to 100.
  - A "Feedback" section that explains the reasoning behind the score in detail, covering the points above.
  - A "Suggestions" section with specific, actionable advice on how to improve the resume.

  Resume PDF:
  {{media url=pdfDataUri}}`,
});

const analyzeResumeAtsPdfFlow = ai.defineFlow(
  {
    name: 'analyzeResumeAtsPdfFlow',
    inputSchema: AnalyzeResumeAtsPdfInputSchema,
    outputSchema: AnalyzeResumeAtsPdfOutputSchema,
  },
  async input => {
    const {output} = await atsAnalysisPdfPrompt(input);
    return output!;
  }
);
