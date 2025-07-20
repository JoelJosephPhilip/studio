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
  template: z.string().describe('The chosen resume template style.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "Optional photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type AiResumeBuilderInput = z.infer<typeof AiResumeBuilderInputSchema>;

const ResumeSchema = z.object({
    personalDetails: z.object({
        fullName: z.string(),
        email: z.string(),
        phoneNumber: z.string(),
        address: z.string().optional(),
        linkedIn: z.string().optional(),
        portfolio: z.string().optional(),
    }),
    professionalSummary: z.string(),
    workExperience: z.array(z.object({
        jobTitle: z.string(),
        company: z.string(),
        location: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        responsibilities: z.string(),
    })),
    education: z.array(z.object({
        institution: z.string(),
        degree: z.string(),
        fieldOfStudy: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
    })),
    skills: z.array(z.string()),
});

const AiResumeBuilderOutputSchema = z.object({
  resume: ResumeSchema.describe('The generated resume as a structured JSON object.'),
});

export type AiResumeBuilderOutput = z.infer<typeof AiResumeBuilderOutputSchema>;

export async function aiResumeBuilder(input: AiResumeBuilderInput): Promise<AiResumeBuilderOutput> {
  return aiResumeBuilderFlow(input);
}

const resumePrompt = ai.definePrompt({
  name: 'aiResumeBuilderPrompt',
  input: {schema: AiResumeBuilderInputSchema},
  output: {schema: AiResumeBuilderOutputSchema},
  prompt: `You are an AI resume builder. Your goal is to create a professional resume based on user details and, if provided, a job description.
  The user has provided their information in a stringified format. Parse this information and create a structured JSON resume object.
  For the skills section, convert the comma-separated string of skills into an array of strings.

  User Details: {{{userDetails}}}
  {{#if jobDescription}}
  Job Description: {{{jobDescription}}}
  {{/if}}
  {{#if photoDataUri}}
  Photo: {{media url=photoDataUri}}
  {{/if}}

  Please generate a resume that is ATS-optimized and highlights the user's skills and experience in a way that is relevant to the job description (if provided).
  Return the resume as a structured JSON object matching the provided schema.
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
