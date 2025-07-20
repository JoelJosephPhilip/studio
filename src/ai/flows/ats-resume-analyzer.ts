'use server';

/**
 * @fileOverview A flow to analyze a resume for ATS compliance.
 *
 * - analyzeResumeAts - A function that handles the resume analysis process.
 * - AnalyzeResumeAtsInput - The input type for the analyzeResumeAts function.
 * - AnalyzeResumeAtsOutput - The return type for the analyzeResumeAts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeResumeAtsInputSchema = z.object({
  resumeText: z.string().describe('The text content of the resume to analyze.'),
});
export type AnalyzeResumeAtsInput = z.infer<typeof AnalyzeResumeAtsInputSchema>;

const AnalyzeResumeAtsOutputSchema = z.object({
  atsReadinessScore: z
    .number()
    .describe(
      'A score indicating the ATS readiness of the resume (0-100, higher is better).'
    ),
  feedback: z.string().describe('Detailed feedback on grammar, keyword density, and format compliance.'),
  suggestions: z.string().describe('Specific suggestions to improve ATS compliance.'),
});
export type AnalyzeResumeAtsOutput = z.infer<typeof AnalyzeResumeAtsOutputSchema>;

export async function analyzeResumeAts(input: AnalyzeResumeAtsInput): Promise<AnalyzeResumeAtsOutput> {
  return analyzeResumeAtsFlow(input);
}

const atsAnalysisPrompt = ai.definePrompt({
  name: 'atsAnalysisPrompt',
  input: {schema: AnalyzeResumeAtsInputSchema},
  output: {schema: AnalyzeResumeAtsOutputSchema},
  prompt: `You are an expert resume analyst specializing in Applicant Tracking System (ATS) compliance.

  Analyze the following resume text. Provide a detailed analysis covering the following points:
  1.  **Keyword Optimization**: How well does the resume use relevant keywords?
  2.  **Formatting**: Is the resume format clean, professional, and easy for an ATS to parse?
  3.  **Clarity and Conciseness**: Is the language clear and to the point?
  4.  **Action Verbs**: Does the resume use strong action verbs to describe accomplishments?
  
  Based on your analysis, provide:
  - An overall "ATS Readiness Score" from 0 to 100.
  - A "Feedback" section that explains the reasoning behind the score in detail, covering the points above.
  - A "Suggestions" section with specific, actionable advice on how to improve the resume.

  Resume Text:
  {{{resumeText}}}`,
});

const analyzeResumeAtsFlow = ai.defineFlow(
  {
    name: 'analyzeResumeAtsFlow',
    inputSchema: AnalyzeResumeAtsInputSchema,
    outputSchema: AnalyzeResumeAtsOutputSchema,
  },
  async input => {
    const {output} = await atsAnalysisPrompt(input);
    return output!;
  }
);
