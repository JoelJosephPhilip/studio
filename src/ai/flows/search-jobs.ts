
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
          const errorBody = await response.text();
          lastError = new Error(`API request failed with status ${response.status}: ${errorBody}`);
          
          // Retry only on server errors (5xx)
          if (response.status >= 500 && attempts < maxAttempts) {
            console.warn(`Attempt ${attempts} failed with status ${response.status}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
          
          // For non-server errors or after all retries, throw immediately.
          console.error(`API Error Response (Status: ${response.status}): ${errorBody}`);
          throw lastError;
        }
        
        const data: any = await response.json();

        // Defensive mapping to prevent schema validation errors
        const jobs = data.hits.map((job: any) => ({
          id: String(job.id ?? crypto.randomUUID()),
          source: 'Indeed',
          title: job.title ?? "Untitled Job",
          company: job.company_name ?? "Unknown Company",
          location: job.location ?? "Not specified",
          description: job.description ?? "No description provided.",
          url: job.url?.startsWith("http") ? job.url : `https://indeed.com/viewjob?jk=${job.id}`,
        }));
        
        return { jobs };

      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempts} - An error occurred during fetch:`, error.message);
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
    
    // If all attempts fail, throw the last known error.
    throw new Error(`Failed to fetch jobs after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }
);
