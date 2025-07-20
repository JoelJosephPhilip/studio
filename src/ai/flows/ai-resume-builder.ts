'use server';

/**
 * @fileOverview This file contains the Genkit flow for AI-powered resume generation.
 *
 * - aiResumeBuilder - The main function to generate a resume using AI.
 * - AiResumeBuilderInput - The input type for the aiResumeBuilder function.
 * - AiResumeBuilderOutput - The output type for the aiResumeBuilder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiResumeBuilderInputSchema = z.object({
  userDetails: z
    .string()
    .describe('Details about the user, including name, contact information, and desired job.'),
  jobDescription: z
    .string()
    .optional()
    .describe('Optional job description to tailor the resume to.'),
  templatePreferences: z
    .string()
    .optional()
    .describe('Optional preferences for the resume template.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "Optional photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type AiResumeBuilderInput = z.infer<typeof AiResumeBuilderInputSchema>;

const AiResumeBuilderOutputSchema = z.object({
  resume: z.string().describe('The generated resume in a suitable format (e.g., text, Markdown, or JSON).'),
  atsScore: z.number().optional().describe('Optional ATS score for the resume.'),
});

export type AiResumeBuilderOutput = z.infer<typeof AiResumeBuilderOutputSchema>;

export async function aiResumeBuilder(input: AiResumeBuilderInput): Promise<AiResumeBuilderOutput> {
  return aiResumeBuilderFlow(input);
}

const resumePrompt = ai.definePrompt({
  name: 'aiResumeBuilderPrompt',
  input: {schema: AiResumeBuilderInputSchema},
  output: {schema: AiResumeBuilderOutputSchema},
  prompt: `You are an AI resume builder. Your goal is to create a professional-looking resume based on user details and, if provided, a job description and template preferences.

  User Details: {{{userDetails}}}
  {{#if jobDescription}}
  Job Description: {{{jobDescription}}}
  {{/if}}
  {{#if templatePreferences}}
  Template Preferences: {{{templatePreferences}}}
  {{/if}}
  {{#if photoDataUri}}
  Photo: {{media url=photoDataUri}}
  {{/if}}

  Please generate a resume that is ATS-optimized and highlights the user's skills and experience in a way that is relevant to the job description (if provided).
  Return the resume in a well-formatted text format. Do not include an ATS score in the output.
  `,
});

const aiResumeBuilderFlow = ai.defineFlow(
  {
    name: 'aiResumeBuilderFlow',
    inputSchema: AiResumeBuilderInputSchema,
    outputSchema: AiResumeBuilderOutputSchema,
  },
  async input => {
    const {output} = await resumePrompt(input);
    return output!;
  }
);
