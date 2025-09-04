
'use server';

/**
 * @fileOverview Manages saving resumes to the Firestore database.
 *
 * - saveResumeToDb - Saves resume data to the user's document in Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    return saveResumeToDbFlow(input);
}


const saveResumeToDbFlow = ai.defineFlow(
    {
        name: 'saveResumeToDbFlow',
        inputSchema: SaveResumeToDbInputSchema,
        outputSchema: SaveResumeToDbOutputSchema,
    },
    async (input) => {
        if (!input.userId) {
            throw new Error('User not authenticated');
        }

        const resumesCollectionRef = collection(db, 'users', input.userId, 'resumes');
        
        const docRef = await addDoc(resumesCollectionRef, {
            title: input.title,
            content: input.resumeText,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return { resumeId: docRef.id };
    }
);

    