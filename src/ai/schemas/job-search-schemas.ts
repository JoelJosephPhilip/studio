
/**
 * @fileOverview Zod schemas for the job search feature.
 */

import { z } from 'zod';
import type { JdResumeSimilarityMatchingOutput } from '@/ai/flows/jd-resume-similarity-matching';

// --- Schemas for the Job Search Flow ---

export const SearchJobsInputSchema = z.object({
  query: z.string().describe('The job title or keywords to search for.'),
  location: z.string().describe('The location to search for jobs in.'),
});
export type SearchJobsInput = z.infer<typeof SearchJobsInputSchema>;

const JobSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  url: z.string().url(),
});
export type Job = z.infer<typeof JobSchema>;

export const SearchJobsOutputSchema = z.object({
  jobs: z.array(JobSchema),
});
export type SearchJobsOutput = z.infer<typeof SearchJobsOutputSchema>;

// --- Type definition for the enriched job object used in the frontend ---

export type EnrichedJob = Job & {
  matchReport?: JdResumeSimilarityMatchingOutput;
  isSaving?: boolean;
};

    