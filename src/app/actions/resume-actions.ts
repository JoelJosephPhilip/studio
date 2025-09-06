
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes and jobs from Firestore.
 * This file uses the user's email as the document ID in the 'users' collection.
 */

import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

// --- Type Definitions for Function Outputs ---

export type Resume = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

// --- Schemas for Resume Actions ---

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


// --- Schemas for Job Actions ---

const MatchReportSchema = z.object({
    score: z.number(),
    matches: z.array(z.string()),
    gaps: z.array(z.string()),
    summary: z.string(),
});

const JobDataSchema = z.object({
    source: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string(),
    url: z.string().url(),
});

const SaveJobInputSchema = z.object({
  userEmail: z.string().email(),
  jobData: JobDataSchema,
  matchReport: MatchReportSchema,
});
export type SaveJobInput = z.infer<typeof SaveJobInputSchema>;


// --- Server Actions ---

/**
 * Saves resume data to the user's document in Firestore.
 */
export async function saveResumeToDb(input: SaveResumeToDbInput): Promise<{ resumeId: string }> {
  try {
    if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return { resumeId: 'dev-mode-no-db' };
    }
      
    const { userEmail, title, resumeText } = SaveResumeToDbInputSchema.parse(input);
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
 * Fetches all resumes for a given user.
 */
export async function getResumes(input: GetResumesInput): Promise<Resume[]> {
  try {
     if (!db) {
        console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
        return [];
    }
      
    const { userEmail } = GetResumesInputSchema.parse(input);
    const resumesCollectionRef = db.collection('users').doc(userEmail).collection('resumes');
    const snapshot = await resumesCollectionRef.orderBy('updatedAt', 'desc').get();

    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        createdAt: (data.createdAt as Timestamp)?.toDate?.() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate?.() || new Date(),
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
      
    const { userEmail, resumeId } = DeleteResumeInputSchema.parse(input);
    const resumeDocRef = db.collection('users').doc(userEmail).collection('resumes').doc(resumeId);
    await resumeDocRef.delete();

    return { success: true };
  } catch (error: any) {
    console.error("Firestore delete error in deleteResume:", error.message);
    throw new Error(`Failed to delete resume from database: ${error.message}`);
  }
}

/**
 * Saves a job and its match report to the user's document in Firestore.
 */
export async function saveJob(input: SaveJobInput): Promise<{ jobId: string }> {
    try {
        if (!db) {
            console.warn('Firebase Admin SDK not initialized. Skipping DB operation.');
            return { jobId: 'dev-mode-no-db' };
        }
        const { userEmail, jobData, matchReport } = SaveJobInputSchema.parse(input);
        const savedJobsCollection = db.collection('users').doc(userEmail).collection('saved-jobs');
        
        const docRef = await savedJobsCollection.add({
            ...jobData,
            matchReport,
            savedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { jobId: docRef.id };
    } catch (error: any) {
        console.error("Firestore save error in saveJob:", error.message);
        throw new Error(`Failed to save job to database: ${error.message}`);
    }
}
