
'use server';

/**
 * @fileOverview Manages saving resumes to the Firestore database using server actions.
 *
 * - saveResumeToDb - Saves resume data to the user's document in Firestore.
 */

import { z } from 'zod';
import * as admin from 'firebase-admin';

const SaveResumeToDbInputSchema = z.object({
  userId: z.string().describe("The user's unique ID."),
  title: z.string().describe('The title of the resume.'),
  resumeText: z.string().describe('The full text content of the resume.'),
});

export type SaveResumeToDbInput = z.infer<typeof SaveResumeToDbInputSchema>;

const SaveResumeToDbOutputSchema = z.object({
  resumeId: z.string().describe('The ID of the saved resume document in Firestore.'),
});

export type SaveResumeToDbOutput = z.infer<typeof SaveResumeToDbOutputSchema>;

// Initialize Firebase Admin SDK only when the function is called.
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
        } catch (error) {
            console.error('Firebase admin initialization error:', error);
            throw new Error('Firebase admin initialization failed.');
        }
    }
    return admin.firestore();
}

export async function saveResumeToDb(input: SaveResumeToDbInput): Promise<SaveResumeToDbOutput> {
  try {
    const db = initializeFirebaseAdmin();
    
    if (!input.userId) {
      throw new Error('User not authenticated');
    }

    const resumesCollectionRef = db.collection('users').doc(input.userId).collection('resumes');
    
    const docRef = await resumesCollectionRef.add({
        title: input.title,
        content: input.resumeText,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return { resumeId: docRef.id };
  } catch (error: any) {
      console.error("Firestore save error in saveResumeToDb:", error.message);
      throw new Error(`Failed to save resume to database: ${error.message}`);
  }
}
