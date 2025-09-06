
'use server';
/**
 * @fileOverview A Genkit flow for searching jobs using the Indeed API via RapidAPI.
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
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY is not set in the environment variables.");
    }
    
    const url = `https://indeed12.p.rapidapi.com/jobs/search?query=${encodeURIComponent(
      query
    )}&location=${encodeURIComponent(location)}&page_id=1`;

    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'indeed12.p.rapidapi.com'
      }
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const body = await response.text();
      console.error("Indeed API raw error response:", body);
      throw new Error(
        `Indeed API request failed. Status: ${response.status}, Body: ${body}`
      );
    }

    const data: any = await response.json();
    console.log("Indeed API raw response:", JSON.stringify(data, null, 2));

    const results = data.hits ?? [];

    const jobs = results.map((job: any) => ({
      id: String(job.id ?? crypto.randomUUID()),
      source: "Indeed",
      title: job.title ?? "Untitled Job",
      company: job.company_name ?? "Unknown Company",
      location: job.location ?? "Not specified",
      description: job.description ?? "No description provided.",
      url: job.url?.startsWith("http")
        ? job.url
        : `https://indeed.com/viewjob?jk=${job.id}`,
    }));

    return { jobs };
  }
);
