
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes from the Firestore database using server actions.
 * This file uses the user's email as the document ID in the 'users' collection to ensure consistency
 * between different authentication providers (Firebase native vs. NextAuth with Google).
 */

import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

// --- Zod Schemas for Input Validation ---

const SaveResumeToDbInputSchema = z.object({
  userEmail: z.string().email("A valid user email is required."),
  title: z.string().describe('The title of the resume.'),
  resumeText: z.string().describe('The full text content of the resume.'),
});
export type SaveResumeToDbInput = z.infer<typeof SaveResumeToDbInputSchema>;

const GetResumesInputSchema = z.object({
  userEmail: z.string().email("A valid user email is required."),
});
export type GetResumesInput = z.infer<typeof GetResumesInputSchema>;

const DeleteResumeInputSchema = z.object({
  userEmail: z.string().email("A valid user email is required."),
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
 * Saves resume data to the user's document in Firestore using their email as the key.
 */
export async function saveResumeToDb(input: SaveResumeToDbInput): Promise<SaveResumeToDbOutput> {
  try {
    if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return { resumeId: 'dev-mode-no-db' };
    }
      
    const { userEmail, title, resumeText } = SaveResumeToDbInputSchema.parse(input);

    if (!userEmail) {
      throw new Error('User not authenticated');
    }

    const resumesCollectionRef = db.collection('users').doc(userEmail).collection('resumes');
    
    const docRef = await resumesCollectionRef.add({
        title: title,
        content: resumeText,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { resumeId: docRef.id };
  } catch (error: any) {
      console.error("Firestore save error in saveResumeToDb:", error.message);
      throw new Error(`Failed to save resume to database: ${error.message}`);
  }
}

/**
 * Fetches all resumes for a given user using their email.
 */
export async function getResumes(input: GetResumesInput): Promise<Resume[]> {
  try {
     if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return [];
    }
      
    const { userEmail } = GetResumesInputSchema.parse(input);

    if (!userEmail) {
      console.log("getResumes: No user email provided.");
      return [];
    }

    const resumesCollectionRef = db.collection('users').doc(userEmail).collection('resumes');
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
        // Handle both JS Date (from older saves) and Firestore Timestamps
        createdAt: data.createdAt instanceof Date
          ? data.createdAt
          : (data.createdAt as Timestamp)?.toDate?.() || new Date(),
        updatedAt: data.updatedAt instanceof Date
          ? data.updatedAt
          : (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
      };
    });
  } catch (error: any) {
    console.error("Firestore get error in getResumes:", error.message);
    throw new Error(`Failed to get resumes from database: ${error.message}`);
  }
}

/**
 * Deletes a specific resume for a given user using their email.
 */
export async function deleteResume(input: DeleteResumeInput): Promise<{ success: boolean }> {
  try {
     if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return { success: true };
    }
      
    const { userEmail, resumeId } = DeleteResumeInputSchema.parse(input);

    if (!userEmail || !resumeId) {
        throw new Error("User email and Resume ID are required.");
    }

    const resumeDocRef = db.collection('users').doc(userEmail).collection('resumes').doc(resumeId);
    await resumeDocRef.delete();

    return { success: true };
  } catch (error: any) {
    console.error("Firestore delete error in deleteResume:", error.message);
    throw new Error(`Failed to delete resume from database: ${error.message}`);
  }
}
