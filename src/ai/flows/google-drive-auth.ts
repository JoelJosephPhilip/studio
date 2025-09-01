'use server';

/**
 * @fileOverview Manages Google Drive authentication flows.
 *
 * - getAuthUrl - Generates a URL for the Google OAuth consent screen.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';

const GetAuthUrlOutputSchema = z.object({
  authUrl: z.string().describe('The URL for the Google OAuth consent screen.'),
});

export type GetAuthUrlOutput = z.infer<typeof GetAuthUrlOutputSchema>;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    : 'http://localhost:3000/api/auth/callback/google'
);

export async function getAuthUrl(): Promise<GetAuthUrlOutput> {
  return getAuthUrlFlow();
}

const getAuthUrlFlow = ai.defineFlow(
  {
    name: 'getAuthUrlFlow',
    inputSchema: z.void(),
    outputSchema: GetAuthUrlOutputSchema,
  },
  async () => {
    const scopes = ['https://www.googleapis.com/auth/drive.file'];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    return { authUrl };
  }
);
