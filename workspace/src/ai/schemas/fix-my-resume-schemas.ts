/**
 * @fileOverview This file defines the Zod schemas and TypeScript types for the "Fix My Resume" feature.
 * By separating schemas from the flow, we avoid "use server" module constraint violations in Next.js.
 *
 * - FixMyResumeInputSchema - The Zod schema for the input of the fixMyResume flow.
 * - FixMyResumeInput - The TypeScript type inferred from the input schema.
 * - FixMyResumeOutputSchema - The Zod schema for the output of the fixMyResume flow.
 * - FixMyResumeOutput - The TypeScript type inferred from the output schema.
 */

import { z } from 'zod';

export const FixMyResumeInputSchema = z.object({
  resumeText: z.string().describe("The full text content of the user's original resume."),
  atsReportText: z.string().describe("The full text content of the ATS analysis report for the resume."),
});
export type FixMyResumeInput = z.infer<typeof FixMyResumeInputSchema>;

export const FixMyResumeOutputSchema = z.object({
  improvedResumeText: z.string().describe('The full text of the improved and rewritten resume.'),
  changesSummary: z.array(z.string()).describe('A bulleted list summarizing the key changes made to the resume.'),
});
export type FixMyResumeOutput = z.infer<typeof FixMyResumeOutputSchema>;
