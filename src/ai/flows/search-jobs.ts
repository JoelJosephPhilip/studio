
'use server';
/**
 * @fileOverview A Genkit flow for searching jobs using the Indeed Scraper API via RapidAPI.
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

    const url = `https://indeed-scraper-api.p.rapidapi.com/api/job`;

    const options = {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "indeed-scraper-api.p.rapidapi.com",
      },
      body: JSON.stringify({
        scraper: {
          query: query,
          location: location,
          country: 'us', // Defaulting to US as per example
          maxRows: 15,
        }
      })
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
    
    // This new API returns an array directly
    const results = data ?? [];

    const jobs = results.map((job: any) => ({
      id: String(job.jobkey ?? crypto.randomUUID()),
      source: "Indeed (Scraper API)",
      title: job.title ?? "Untitled Job",
      company: job.company ?? "Unknown Company",
      location: job.location ?? "Not specified",
      description: job.summary ?? "No description provided.",
      url: job.url?.startsWith("http")
        ? job.url
        : `https://indeed.com${job.url}`, // This API often returns relative URLs
    }));

    return { jobs };
  }
);
