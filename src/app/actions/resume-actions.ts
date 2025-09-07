
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes using Supabase.
 */

import { z } from 'zod';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {v4 as uuidv4} from 'uuid';


export type Resume = {
  id: string;
  title: string;
  file_type: 'pdf' | 'txt' | 'text';
  storage_path: string | null;
  text_content: string | null;
  created_at: string;
  updated_at: string;
};

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
  jobData: JobDataSchema,
  matchReport: MatchReportSchema,
});
export type SaveJobInput = z.infer<typeof SaveJobInputSchema>;


// --- Server Actions ---

const SavePastedResumeInputSchema = z.object({
  title: z.string().min(2, 'A title is required.'),
  resumeText: z.string().min(50, 'Resume content is too short.'),
});
export type SavePastedResumeInput = z.infer<typeof SavePastedResumeInputSchema>;

export async function savePastedResume(input: SavePastedResumeInput): Promise<{ resumeId: string }> {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to save a resume.');
  }
  
  const { title, resumeText } = SavePastedResumeInputSchema.parse(input);

  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      title,
      text_content: resumeText,
      file_type: 'text',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase save error:', error.message);
    throw new Error(`Failed to save resume: ${error.message}`);
  }

  return { resumeId: data.id };
}


const UploadAndSaveResumeInputSchema = z.object({
  title: z.string().min(2, 'A title is required.'),
  file: z.instanceof(File),
});
export type UploadAndSaveResumeInput = z.infer<typeof UploadAndSaveResumeInputSchema>;

export async function uploadAndSaveResume(input: UploadAndSaveResumeInput): Promise<{ resumeId: string }> {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { title, file } = UploadAndSaveResumeInputSchema.parse(input);

  const fileExt = file.name.split('.').pop();
  const resumeId = uuidv4();
  const filePath = `resumes/${user.id}/${resumeId}.${fileExt}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, file);
  if (uploadError) {
    console.error('Supabase upload error:', uploadError.message);
    throw new Error('Failed to upload file.');
  }

  // TODO: Implement text extraction (e.g., using a Supabase Edge Function)
  // For now, we save null for text_content on file uploads.
  
  // Insert into database
  const { data, error: dbError } = await supabase
    .from('resumes')
    .insert({
      id: resumeId,
      user_id: user.id,
      title,
      storage_path: filePath,
      file_type: fileExt as 'pdf' | 'txt',
      text_content: null,
    })
    .select('id')
    .single();

  if (dbError) {
    console.error('Supabase DB insert error:', dbError.message);
    // Attempt to clean up storage if DB insert fails
    await supabase.storage.from('resumes').remove([filePath]);
    throw new Error('Failed to save resume metadata.');
  }

  return { resumeId: data.id };
}


export async function getResumes(): Promise<Resume[]> {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Supabase get error:', error.message);
    throw new Error('Failed to fetch resumes.');
  }
  
  return data as Resume[];
}


const DeleteResumeInputSchema = z.object({
  resumeId: z.string(),
  storagePath: z.string().optional().nullable(),
});
export type DeleteResumeInput = z.infer<typeof DeleteResumeInputSchema>;


export async function deleteResume(input: DeleteResumeInput): Promise<{ success: boolean }> {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');
  
  const { resumeId, storagePath } = DeleteResumeInputSchema.parse(input);
  
  // Delete from storage first if path exists
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from('resumes').remove([storagePath]);
    if (storageError) {
      console.error('Supabase storage delete error:', storageError.message);
      // We can choose to continue and delete the DB record anyway, or throw.
      // Let's throw for now to make the user aware.
      throw new Error('Failed to delete resume file from storage.');
    }
  }

  // Delete from database
  const { error: dbError } = await supabase.from('resumes').delete().match({ id: resumeId });
  if (dbError) {
    console.error('Supabase DB delete error:', dbError.message);
    throw new Error('Failed to delete resume from database.');
  }

  return { success: true };
}


/**
 * Saves a job and its match report to the user's document in Supabase.
 */
export async function saveJob(input: SaveJobInput): Promise<{ jobId: string }> {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to save a job.');
  }

  const { jobData, matchReport } = SaveJobInputSchema.parse(input);

  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({
      user_id: user.id,
      ...jobData,
      match_report: matchReport,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase save job error:', error.message);
    // You might want to check for specific error codes, e.g., if 'saved_jobs' table doesn't exist
    if (error.code === '42P01') { // 'undefined_table'
        throw new Error("The 'saved_jobs' table does not exist. Please create it in your Supabase project.");
    }
    throw new Error(`Failed to save job: ${error.message}`);
  }

  return { jobId: data.id };
}
