
/**
 * @fileOverview This file defines the Zod schemas and TypeScript types for the Skill Gap & Career Path feature.
 */

import { z } from 'zod';

// --- Input Schema ---

export const SkillGapCareerPathInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  jobDescriptionText: z.string().describe("The text content of the target job description."),
});
export type SkillGapCareerPathInput = z.infer<typeof SkillGapCareerPathInputSchema>;


// --- Output Schema ---

const SkillGapAnalysisSchema = z.object({
  have: z.array(z.string()).describe("A list of skills the user possesses that are relevant to the job description."),
  missing: z.array(z.string()).describe("A list of skills required by the job description that are missing from the resume."),
  weak: z.array(z.string()).describe("A list of skills present in the resume but could be better highlighted or are not well-supported."),
});

const CareerPathStepSchema = z.object({
  role: z.string().describe("The name of the role at this career stage."),
  timeline: z.string().describe("The expected timeline to reach this role (e.g., '2-4 years')."),
  requiredSkills: z.array(z.string()).describe("A list of skills required for this role."),
  certifications: z.array(z.string()).describe("A list of recommended certifications or courses."),
  resources: z.array(z.string()).describe("A list of suggested learning resources."),
});

export const SkillGapCareerPathOutputSchema = z.object({
  skillGapAnalysis: SkillGapAnalysisSchema,
  careerPath: z.array(CareerPathStepSchema).describe("A multi-step career path roadmap."),
});
export type SkillGapCareerPathOutput = z.infer<typeof SkillGapCareerPathOutputSchema>;
