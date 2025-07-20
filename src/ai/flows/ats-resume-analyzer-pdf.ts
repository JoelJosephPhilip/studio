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

const AnalysisCategorySchema = z.object({
  score: z.number().describe('The score for this category (0-100).'),
  feedback: z.string().describe('Detailed feedback for this category.'),
});


const AnalyzeResumeAtsPdfOutputSchema = z.object({
  atsReadinessScore: z
    .number()
    .describe(
      'An overall score indicating the ATS readiness of the resume (0-100, higher is better).'
    ),
  keywordOptimization: AnalysisCategorySchema.describe('Analysis of keyword optimization.'),
  clarityAndConciseness: AnalysisCategorySchema.describe('Analysis of clarity and conciseness.'),
  formattingAndStructure: AnalysisCategorySchema.describe('Analysis of formatting and structure.'),
  actionVerbs: AnalysisCategorySchema.describe('Analysis of the use of action verbs.'),
  suggestions: z.string().describe('Specific, actionable suggestions to improve the resume overall.'),
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

  Extract the text from the following resume PDF. Then, for each of the four main categories (Keyword Optimization, Clarity and Conciseness, Formatting and Structure, Action Verbs), provide a score from 0-100 and detailed feedback explaining the score.
  
  Then, provide an overall "ATS Readiness Score" which is the average of the four category scores.
  
  Finally, provide a "Suggestions" string with specific, actionable advice on how to improve the resume.

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
