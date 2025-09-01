
'use server';

/**
 * @fileOverview Manages saving files to Google Drive.
 *
 * - saveToDrive - Saves a file to the user's Google Drive.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    : 'http://localhost:3000/api/auth/callback/google'
);

const SaveToDriveInputSchema = z.object({
  fileName: z.string().describe('The name of the file to save.'),
  fileContent: z.string().describe('The content of the file, base64 encoded.'),
  mimeType: z.string().describe('The MIME type of the file.'),
});

export type SaveToDriveInput = z.infer<typeof SaveToDriveInputSchema>;

const SaveToDriveOutputSchema = z.object({
  fileId: z.string().describe('The ID of the saved file in Google Drive.'),
});

export type SaveToDriveOutput = z.infer<typeof SaveToDriveOutputSchema>;


export async function saveToDrive(input: SaveToDriveInput): Promise<SaveToDriveOutput> {
    return saveToDriveFlow(input);
}


const saveToDriveFlow = ai.defineFlow(
    {
        name: 'saveToDriveFlow',
        inputSchema: SaveToDriveInputSchema,
        outputSchema: SaveToDriveOutputSchema,
    },
    async (input) => {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            throw new Error('User not authenticated');
        }
        const userId = session.user.id;

        const userDocRef = doc(db, 'users', userId, 'private', 'googleAuth');
        const userDoc = await getDoc(userDocRef);
        const tokens = userDoc.data();

        if (!tokens || !tokens.accessToken) {
            throw new Error('User not authenticated with Google or tokens are missing.');
        }

        oauth2Client.setCredentials({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const fileMetadata = {
            name: input.fileName,
        };
        const media = {
            mimeType: input.mimeType,
            body: Buffer.from(input.fileContent, 'base64'),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        const fileId = response.data.id;
        if (!fileId) {
            throw new Error('Failed to save file to Google Drive');
        }

        return { fileId };
    }
);
