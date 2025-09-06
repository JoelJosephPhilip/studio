
'use server';
/**
 * @fileOverview A Genkit flow for searching jobs using the SerpApi Google Jobs API.
 */
import { ai } from '@/ai/genkit';
import { SearchJobsInputSchema, SearchJobsOutputSchema, type SearchJobsInput, type SearchJobsOutput } from '@/ai/schemas/job-search-schemas';
import fetch from 'node-fetch';

export async function searchJobs(input: SearchJobsInput): Promise<SearchJobsOutput> {
  return searchJobsFlow(input);
}

const searchJobsFlow = ai.defineFlow(
  {
    name: "searchJobsFlow",
    inputSchema: SearchJobsInputSchema,
    outputSchema: SearchJobsOutputSchema,
  },
  async (input) => {
    const { query, location } = input;
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
      throw new Error("SERPAPI_KEY is not set in the environment variables.");
    }
    
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.append('engine', 'google_jobs');
    url.searchParams.append('q', query);
    
    // SerpApi uses a 'chips' parameter for filters like "remote".
    // If the user enters "remote", we use the chips parameter instead of location.
    if (location.toLowerCase().trim() === 'remote') {
      url.searchParams.append('chips', 'remote');
    } else {
      url.searchParams.append('location', location);
    }
    
    url.searchParams.append('api_key', apiKey);

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const body = await response.text();
      console.error("SerpApi raw error response:", body);
      throw new Error(
        `SerpApi request failed. Status: ${response.status}, Body: ${body}`
      );
    }

    const data: any = await response.json();
    
    const results = data.jobs_results || [];
    
    if (!Array.isArray(results)) {
        console.error("API response did not contain a valid jobs array. Response:", data);
        throw new Error("Invalid response structure from job search API.");
    }

    const jobs = results.map((job: any) => ({
      id: String(job.job_id ?? crypto.randomUUID()),
      source: "Google Jobs via SerpApi",
      title: job.title ?? "Untitled Job",
      company: job.company_name ?? "Unknown Company",
      location: job.location ?? "Not specified",
      description: job.description ?? "No description provided.",
      url: job.related_links?.[0]?.link ?? `https://www.google.com/search?q=${encodeURIComponent(job.title + " " + job.company_name)}`,
    }));

    return { jobs };
  }
);
