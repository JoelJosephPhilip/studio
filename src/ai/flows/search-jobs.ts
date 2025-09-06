
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
    name: 'searchJobsFlow',
    inputSchema: SearchJobsInputSchema,
    outputSchema: SearchJobsOutputSchema,
  },
  async (input) => {
    const { query, location } = input;
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      throw new Error('RAPIDAPI_KEY is not set in the environment variables.');
    }

    const url = `https://indeed12.p.rapidapi.com/jobs/search?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&page_id=1`;

    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'indeed12.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error Response (Status: ${response.status}): ${errorBody}`);
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
      }
      
      const data: any = await response.json();

      // Normalize the API response to our Job schema
      const jobs = data.hits.map((job: any) => ({
        id: job.id,
        source: 'Indeed',
        title: job.title,
        company: job.company_name,
        location: job.location,
        description: job.description,
        url: job.url,
      }));

      return { jobs };

    } catch (error: any) {
      console.error('Failed to fetch jobs:', error);
      throw new Error(`Failed to fetch jobs from the external API. Reason: ${error.message}`);
    }
  }
);
