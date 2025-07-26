'use server';

/**
 * @fileOverview A flow to intelligently rewrite a resume based on an ATS analysis report.
 *
 * - fixMyResume - A function that handles the resume improvement process.
 */

import {ai} from '@/ai/genkit';
import {
  FixMyResumeInputSchema,
  FixMyResumeOutputSchema,
  type FixMyResumeInput,
  type FixMyResumeOutput,
} from '@/ai/schemas/fix-my-resume-schemas';


export async function fixMyResume(input: FixMyResumeInput): Promise<FixMyResumeOutput> {
  return fixMyResumeFlow(input);
}

const fixMyResumePrompt = ai.definePrompt({
  name: 'fixMyResumePrompt',
  input: {schema: FixMyResumeInputSchema},
  output: {schema: FixMyResumeOutputSchema},
  prompt: `You are an expert career coach and professional resume writer. Your task is to rewrite a user's resume based on the suggestions from an accompanying ATS (Applicant Tracking System) analysis report.

Analyze the original resume and the ATS report provided below. Your goal is to produce a significantly improved version of the resume that addresses all the criticisms and suggestions in the report.

**Key areas to focus on:**
1.  **Keyword Optimization:** Integrate keywords mentioned as missing in the ATS report. Ensure they are used naturally within the context of the user's experience and skills.
2.  **Clarity and Conciseness:** Rephrase sentences to be clearer, more direct, and impactful. Remove jargon and fluff.
3.  **Formatting and Structure:** While you are outputting text, structure it in a way that would be logical and clean on a final resume document. Use clear headings for sections like "Professional Summary", "Work Experience", "Education", and "Skills".
4.  **Action Verbs:** Replace passive language with strong, compelling action verbs to start bullet points.
5.  **Quantifiable Achievements:** Where possible, reframe responsibilities as quantifiable achievements. You may need to infer reasonable metrics if they are not present, but state that these are suggestions (e.g., "Increased efficiency by an estimated 15%").

**Input:**

**Original Resume Text:**
\`\`\`
{{{resumeText}}}
\`\`\`

**ATS Analysis Report:**
\`\`\`
{{{atsReportText}}}
\`\`\`

**Your Task:**

1.  Generate the full text for the new, improved resume. The output should be a complete resume, not just the changed parts.
2.  Provide a concise summary of the top 3-5 most important changes you made, explaining how they address the ATS report's feedback.

Produce your response in the specified JSON format.`,
});


const fixMyResumeFlow = ai.defineFlow(
  {
    name: 'fixMyResumeFlow',
    inputSchema: FixMyResumeInputSchema,
    outputSchema: FixMyResumeOutputSchema,
  },
  async (input) => {
    const {output} = await fixMyResumePrompt(input);
    return output!;
  }
);
