
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

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                 if (response.status === 500 && attempts < maxAttempts) {
                    console.warn(`Attempt ${attempts} failed with status 500. Retrying...`);
                    lastError = new Error(`API request failed with status ${response.status}: ${await response.text()}`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 second before retrying
                    continue;
                }
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
            lastError = error;
            console.error(`Attempt ${attempts} - Failed to fetch jobs:`, error);
        }
    }
    
    // If all attempts fail, throw the last captured error
    throw new Error(`Failed to fetch jobs from the external API after ${maxAttempts} attempts. Reason: ${lastError?.message || 'Unknown error'}`);
  }
);
