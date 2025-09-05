
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes from the Firestore database using server actions.
 */

import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';

// --- Zod Schemas for Input Validation ---

const SaveResumeToDbInputSchema = z.object({
  userId: z.string().describe("The user's unique ID."),
  title: z.string().describe('The title of the resume.'),
  resumeText: z.string().describe('The full text content of the resume.'),
});
export type SaveResumeToDbInput = z.infer<typeof SaveResumeToDbInputSchema>;

const GetResumesInputSchema = z.object({
  userId: z.string().describe("The user's unique ID."),
});
export type GetResumesInput = z.infer<typeof GetResumesInputSchema>;

const DeleteResumeInputSchema = z.object({
  userId: z.string().describe("The user's unique ID."),
  resumeId: z.string().describe("The ID of the resume to delete."),
});
export type DeleteResumeInput = z.infer<typeof DeleteResumeInputSchema>;


// --- Type Definitions for Function Outputs ---

export type SaveResumeToDbOutput = {
  resumeId: string;
};

export type Resume = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};


// --- Server Actions ---

/**
 * Saves resume data to the user's document in Firestore.
 */
export async function saveResumeToDb(input: SaveResumeToDbInput): Promise<SaveResumeToDbOutput> {
  try {
    if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        // This allows the UI to proceed in a degraded state during development if creds are missing.
        return { resumeId: 'dev-mode-no-db' };
    }
      
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

/**
 * Fetches all resumes for a given user.
 */
export async function getResumes(input: GetResumesInput): Promise<Resume[]> {
  try {
     if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return [];
    }
      
    const { userId } = GetResumesInputSchema.parse(input);

    if (!userId) {
      console.log("getResumes: No user ID provided.");
      return [];
    }

    const resumesCollectionRef = db.collection('users').doc(userId).collection('resumes');
    const snapshot = await resumesCollectionRef.orderBy('updatedAt', 'desc').get();

    if (snapshot.empty) {
      return [];
    }
    
    // Explicitly type the resume data to match the Resume type
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        // Convert Firestore Timestamps to JS Date objects
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      };
    });
  } catch (error: any) {
    console.error("Firestore get error in getResumes:", error.message);
    throw new Error(`Failed to get resumes from database: ${error.message}`);
  }
}

/**
 * Deletes a specific resume for a given user.
 */
export async function deleteResume(input: DeleteResumeInput): Promise<{ success: boolean }> {
  try {
     if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return { success: true };
    }
      
    const { userId, resumeId } = DeleteResumeInputSchema.parse(input);

    if (!userId || !resumeId) {
        throw new Error("User ID and Resume ID are required.");
    }

    const resumeDocRef = db.collection('users').doc(userId).collection('resumes').doc(resumeId);
    await resumeDocRef.delete();

    return { success: true };
  } catch (error: any) {
    console.error("Firestore delete error in deleteResume:", error.message);
    throw new Error(`Failed to delete resume from database: ${error.message}`);
  }
}
