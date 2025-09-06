
'use server';
/**
 * @fileOverview Provides skill gap analysis and career path recommendations based on a resume.
 *
 * - skillGapCareerPathRecommendations - A function that handles the skill gap analysis and career path recommendation process.
 */

import {ai} from '@/ai/genkit';
import {
    SkillGapCareerPathInputSchema,
    SkillGapCareerPathOutputSchema,
    type SkillGapCareerPathInput,
    type SkillGapCareerPathOutput
} from '@/ai/schemas/skill-gap-schemas';


export async function skillGapCareerPathRecommendations(input: SkillGapCareerPathInput): Promise<SkillGapCareerPathOutput> {
  return skillGapCareerPathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'skillGapCareerPathPrompt',
  input: {schema: SkillGapCareerPathInputSchema},
  output: {schema: SkillGapCareerPathOutputSchema},
  prompt: `You are an expert career advisor and skill gap analyst.

Here is the user’s current resume:
---
{{{resumeText}}}
---

Here is the target job description:
---
{{{jobDescriptionText}}}
---

Your tasks are as follows:
1.  Extract all relevant skills (both technical and soft skills) from both the resume and the job description.
2.  Identify which skills from the job description the user already possesses based on their resume. These are the skills they 'have'.
3.  Identify which skills from the job description are completely missing from the user's resume.
4.  Identify which skills are present in the resume but could be considered 'weak'. A skill is weak if it's mentioned infrequently, lacks specific examples, or is not framed with impact.
5.  Generate a detailed, multi-step career path roadmap for the user’s field, showing a typical progression of 3-4 levels (e.g., Junior -> Mid-level -> Senior -> Lead).
6.  For each level in the career path, provide the following details:
    - The typical role name.
    - An estimated timeline in years to reach that role.
    - A list of required skills needed to achieve that role.
    - A list of valuable certifications or courses.
    - A list of suggested learning resources (e.g., Coursera, LinkedIn Learning, Udemy, or free alternatives). For each resource, you must provide a name and a valid, clickable URL.

Please provide the output as a single, structured JSON object that strictly follows the provided output schema.
`,
});

const skillGapCareerPathFlow = ai.defineFlow(
  {
    name: 'skillGapCareerPathFlow',
    inputSchema: SkillGapCareerPathInputSchema,
    outputSchema: SkillGapCareerPathOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
