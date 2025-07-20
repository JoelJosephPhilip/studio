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

const AnalysisCategorySchema = z.object({
  score: z.number().describe('The score for this category (0-100).'),
  feedback: z.string().describe('Detailed feedback for this category.'),
});

const AnalyzeResumeAtsOutputSchema = z.object({
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
export type AnalyzeResumeAtsOutput = z.infer<typeof AnalyzeResumeAtsOutputSchema>;

export async function analyzeResumeAts(input: AnalyzeResumeAtsInput): Promise<AnalyzeResumeAtsOutput> {
  return analyzeResumeAtsFlow(input);
}

const atsAnalysisPrompt = ai.definePrompt({
  name: 'atsAnalysisPrompt',
  input: {schema: AnalyzeResumeAtsInputSchema},
  output: {schema: AnalyzeResumeAtsOutputSchema},
  prompt: `You are an expert resume analyst specializing in Applicant Tracking System (ATS) compliance.

  Analyze the following resume text. For each of the four main categories (Keyword Optimization, Clarity and Conciseness, Formatting and Structure, Action Verbs), provide a score from 0-100 and detailed feedback explaining the score.
  
  Then, provide an overall "ATS Readiness Score" which is the average of the four category scores.
  
  Finally, provide a "Suggestions" string with specific, actionable advice on how to improve the resume.

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
