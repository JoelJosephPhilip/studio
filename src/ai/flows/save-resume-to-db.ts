'use server';

/**
 * @fileOverview Manages saving resumes to the Firestore database using server actions.
 *
 * - saveResumeToDb - Saves resume data to the user's document in Firestore.
 */

import { z } from 'zod';
import { collection, addDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Using the client-side initialized db

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

export async function saveResumeToDb(input: SaveResumeToDbInput): Promise<SaveResumeToDbOutput> {
  try {
    if (!input.userId) {
      throw new Error('User not authenticated');
    }

    // This is now a server action using the client-side SDK.
    // Firestore security rules will enforce that the user can only write to their own documents.
    const userDocRef = doc(db, 'users', input.userId);
    const resumesCollectionRef = collection(userDocRef, 'resumes');
    
    const docRef = await addDoc(resumesCollectionRef, {
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
