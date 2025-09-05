
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes from the Firestore database using server actions.
 */

import { z } from 'zod';
import * as admin from 'firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';

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


// --- Helper function for Firebase Admin SDK Initialization ---

function initializeFirebaseAdmin() {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.warn(`
        Firebase Admin SDK is not configured. 
        Database operations (save, get, delete) will be skipped.
        Please set the following environment variables in your .env.local file:
        - NEXT_PUBLIC_FIREBASE_PROJECT_ID
        - FIREBASE_CLIENT_EMAIL
        - FIREBASE_PRIVATE_KEY
        `);
        return null;
    }

    if (admin.apps.length) {
        return admin.firestore();
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error: any) {
        console.error('Firebase admin initialization error:', error.message);
        throw new Error('Firebase admin initialization failed.');
    }

    return admin.firestore();
}


// --- Server Actions ---

/**
 * Saves resume data to the user's document in Firestore.
 */
export async function saveResumeToDb(input: SaveResumeToDbInput): Promise<SaveResumeToDbOutput> {
  const db = initializeFirebaseAdmin();
  if (!db) {
    // Return a mock success response so the UI doesn't block.
    return { resumeId: 'dev-mode-placeholder-id' };
  }
    
  try {
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
  const db = initializeFirebaseAdmin();
  if (!db) {
    return [];
  }

  try {
    const { userId } = input;

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
  const db = initializeFirebaseAdmin();
  if (!db) {
    return { success: true };
  }

  try {
    const { userId, resumeId } = input;

    const resumeDocRef = db.collection('users').doc(userId).collection('resumes').doc(resumeId);
    await resumeDocRef.delete();

    return { success: true };
  } catch (error: any) {
    console.error("Firestore delete error in deleteResume:", error.message);
    throw new Error(`Failed to delete resume from database: ${error.message}`);
  }
}
