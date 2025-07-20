'use server';
/**
 * @fileOverview Provides skill gap analysis and career path recommendations based on a resume.
 *
 * - skillGapCareerPathRecommendations - A function that handles the skill gap analysis and career path recommendation process.
 * - SkillGapCareerPathInput - The input type for the skillGapCareerPathRecommendations function.
 * - SkillGapCareerPathOutput - The return type for the skillGapCareerPathRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SkillGapCareerPathInputSchema = z.object({
  resumeText: z
    .string()
    .describe('The text content of the user\'s resume.'),
  careerGoals: z.string().optional().describe('The user\'s desired career goals or job titles.'),
  jobDescription: z.string().optional().describe('A job description to compare the resume against.'),
});
export type SkillGapCareerPathInput = z.infer<typeof SkillGapCareerPathInputSchema>;

const SkillGapCareerPathOutputSchema = z.object({
  skillGaps: z.array(z.string()).describe('A list of skills the user is missing to achieve their career goals or match the job description.'),
  careerPathRecommendations: z.array(z.string()).describe('A list of potential career paths based on the user\'s resume and career goals.'),
  additionalRecommendations: z.string().describe('Additional recommendations on how the user can improve their resume or gain new skills.'),
});
export type SkillGapCareerPathOutput = z.infer<typeof SkillGapCareerPathOutputSchema>;

export async function skillGapCareerPathRecommendations(input: SkillGapCareerPathInput): Promise<SkillGapCareerPathOutput> {
  return skillGapCareerPathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'skillGapCareerPathPrompt',
  input: {schema: SkillGapCareerPathInputSchema},
  output: {schema: SkillGapCareerPathOutputSchema},
  prompt: `You are a career advisor. Analyze the provided resume and provide recommendations for skills to learn and potential career paths.

Resume:
{{{resumeText}}}

{% if careerGoals %}Career Goals: {{{careerGoals}}}\n{% endif %}
{% if jobDescription %}Job Description: {{{jobDescription}}}\n{% endif %}

Based on this information, identify skill gaps and suggest relevant career paths.
Also suggest additional recommendations on how the user can improve their resume or gain new skills.

Provide the output in JSON format. Skill gaps and career path recommendations should be a list of strings.
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
