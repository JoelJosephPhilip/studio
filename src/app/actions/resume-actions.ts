
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes and jobs from Firestore.
 * This file uses the user's email as the document ID in the 'users' collection.
 */

import { z } from 'zod';
import type { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import * as pdfjsLib from "pdfjs-dist";

// --- Type Definitions for Function Outputs ---

export type Resume = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

// --- Schemas for Resume Actions ---

const SavePastedResumeInputSchema = z.object({
  userEmail: z.string().email("A valid user email is required."),
  title: z.string().min(2, 'A title is required.'),
  resumeText: z.string().min(50, 'Resume content is too short.'),
});
export type SavePastedResumeInput = z.infer<typeof SavePastedResumeInputSchema>;

const UploadAndSaveResumeInputSchema = z.object({
  userEmail: z.string().email("A valid user email is required."),
  title: z.string().min(2, 'A title is required.'),
  fileDataUri: z.string().describe("A PDF or TXT file as a data URI."),
});
export type UploadAndSaveResumeInput = z.infer<typeof UploadAndSaveResumeInputSchema>;


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
 * Saves resume data from pasted text to the user's document in Firestore.
 */
export async function savePastedResume(input: SavePastedResumeInput): Promise<{ resumeId: string }> {
  try {
    if (!db) {
        throw new Error('Firebase Admin SDK not initialized.');
    }
      
    const { userEmail, title, resumeText } = SavePastedResumeInputSchema.parse(input);
    const resumesCollectionRef = db.collection('users').doc(userEmail).collection('resumes');
    
    const docRef = await resumesCollectionRef.add({
        title: title,
        content: resumeText,
        fileType: 'text',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { resumeId: docRef.id };
  } catch (error: any) {
      console.error("Firestore save error in savePastedResume:", error.message);
      throw new Error(`Failed to save resume: ${error.message}`);
  }
}

/**
 * Extracts text from a file buffer and saves the resume.
 */
async function extractTextAndSave(buffer: Buffer, mimeType: string, title: string, userEmail: string): Promise<string> {
    let textContent = '';
    let fileType = 'text';

    if (mimeType === 'application/pdf') {
        fileType = 'pdf';
        // When running on the server, we need a different worker source.
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc || pdfjsLib.GlobalWorkerOptions.workerSrc.includes('mjs')) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
        const pdf = await pdfjsLib.getDocument(buffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textContent += content.items.map(item => ('str' in item ? item.str : '')).join(' ');
        }
    } else if (mimeType === 'text/plain') {
        textContent = buffer.toString('utf-8');
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
    }

    if (!db) {
        throw new Error('Firebase Admin SDK not initialized.');
    }

    const resumesCollectionRef = db.collection('users').doc(userEmail).collection('resumes');
    const docRef = await resumesCollectionRef.add({
        title,
        content: textContent,
        fileType,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
}


/**
 * Saves an uploaded resume file to Firestore.
 */
export async function uploadAndSaveResume(input: UploadAndSaveResumeInput): Promise<{ resumeId: string }> {
    try {
        const { userEmail, title, fileDataUri } = UploadAndSaveResumeInputSchema.parse(input);
        
        const matches = fileDataUri.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid Data URI format.');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const resumeId = await extractTextAndSave(buffer, mimeType, title, userEmail);

        return { resumeId };
    } catch (error: any) {
        console.error("Error in uploadAndSaveResume:", error.message);
        throw new Error(`Failed to upload resume: ${error.message}`);
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
