
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
    
    const url = 'https://indeed-scraper-api.p.rapidapi.com/api/job';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'indeed-scraper-api.p.rapidapi.com'
      },
      body: JSON.stringify({
        scraper: {
          maxRows: 15,
          query: query,
          location: location,
          jobType: 'fulltime',
          radius: '50',
          sort: 'relevance',
          fromDays: '7',
          country: 'us'
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
    console.log("Indeed API raw response:", JSON.stringify(data, null, 2));

    // Defensively find the array of jobs, whether it's the root response or nested.
    const results = Array.isArray(data) ? data : data.results || data.hits || [];
    
    if (!Array.isArray(results)) {
        console.error("API response did not contain a valid jobs array. Response:", data);
        throw new Error("Invalid response structure from job search API.");
    }

    const jobs = results.map((job: any) => ({
      id: String(job.jobId ?? crypto.randomUUID()),
      source: "Indeed",
      title: job.jobTitle ?? "Untitled Job",
      company: job.company ?? "Unknown Company",
      location: job.location ?? "Not specified",
      description: job.jobDescription ?? "No description provided.",
      url: job.jobUrl?.startsWith("http")
        ? job.jobUrl
        : `https://indeed.com${job.jobUrl}`,
    }));

    return { jobs };
  }
);
