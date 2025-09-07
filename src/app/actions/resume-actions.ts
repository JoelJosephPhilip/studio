
'use server';

/**
 * @fileOverview Manages saving and retrieving resumes and jobs from Supabase.
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {v4 as uuidv4} from 'uuid';

export type Resume = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  file_type: 'pdf' | 'txt' | 'text';
  storage_path: string | null;
};


// --- Schemas for Resume Actions ---

const SavePastedResumeInputSchema = z.object({
  title: z.string().min(2, 'A title is required.'),
  resumeText: z.string().min(50, 'Resume content is too short.'),
  accessToken: z.string(),
});
export type SavePastedResumeInput = z.infer<typeof SavePastedResumeInputSchema>;


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
  accessToken: z.string(),
});
export type SaveJobInput = z.infer<typeof SaveJobInputSchema>;


// --- Server Actions ---

/**
 * Saves resume data from pasted text to the user's document in Supabase.
 */
export async function savePastedResume(input: SavePastedResumeInput): Promise<{ resumeId: string }> {
  const { title, resumeText, accessToken } = SavePastedResumeInputSchema.parse(input);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await supabase.auth.getUser(accessToken);

  if (!user) {
    throw new Error('You must be logged in to save a resume.');
  }
  
  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      title: title,
      text_content: resumeText,
      file_type: 'text',
    })
    .select('id')
    .single();

  if (error) {
    console.error("Supabase save error in savePastedResume:", error.message);
    throw new Error(`Failed to save resume: ${error.message}`);
  }

  return { resumeId: data.id };
}

/**
 * Saves an uploaded resume file to Supabase.
 */
export async function uploadAndSaveResume(formData: FormData): Promise<{ resumeId: string }> {
    const title = formData.get('title') as string;
    const file = formData.get('file') as File;
    const accessToken = formData.get('accessToken') as string;

    if (!title || !file || !accessToken) {
        throw new Error('Missing required form data.');
    }
    
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user } } = await supabase.auth.getUser(accessToken);

    if (!user) {
        throw new Error('You must be logged in to upload a resume.');
    }
    
    if (file.size === 0) {
        throw new Error('No file provided or file is empty.');
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'pdf' && fileExtension !== 'txt') {
         throw new Error('Invalid file type. Please upload a PDF or TXT file.');
    }

    const resumeId = uuidv4();
    const filePath = `${user.id}/${resumeId}.${fileExtension}`;
    
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Supabase upload error:", uploadError.message);
        throw new Error(`Failed to upload resume file: ${uploadError.message}`);
    }

    // Insert metadata into the database
    const { data, error: insertError } = await supabase
        .from('resumes')
        .insert({
            id: resumeId,
            user_id: user.id,
            title,
            file_type: fileExtension as 'pdf' | 'txt',
            storage_path: filePath,
        })
        .select('id')
        .single();
    
    if (insertError) {
        console.error("Supabase insert error after upload:", insertError.message);
        // Attempt to clean up the orphaned storage file
        await supabase.storage.from('resumes').remove([filePath]);
        throw new Error(`Failed to save resume metadata: ${insertError.message}`);
    }

    return { resumeId: data.id };
}


/**
 * Fetches all resumes for a given user.
 */
export async function getResumes(): Promise<Resume[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or Anon Key is not defined.");
  }
  const cookieStore = cookies();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return [];
  }
  const { data: { user } } = await supabase.auth.getUser();


  if (!user) {
    return [];
  }
      
  const { data, error } = await supabase
    .from('resumes')
    .select('id, title, text_content, created_at, updated_at, file_type, storage_path')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Supabase get error in getResumes:", error.message);
    throw new Error(`Failed to get resumes from database: ${error.message}`);
  }

  // Map text_content to content for consistency
  return data.map(r => ({ ...r, content: r.text_content || '' }));
}

/**
 * Deletes a specific resume for a given user.
 */
export async function deleteResume(input: { resumeId: string, storagePath: string | null, accessToken: string }): Promise<{ success: boolean }> {
  const { resumeId, storagePath, accessToken } = input;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await supabase.auth.getUser(accessToken);


  if (!user) {
    throw new Error('You must be logged in to delete a resume.');
  }
      
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from('resumes').remove([storagePath]);
    if (storageError) {
        console.error("Supabase storage delete error:", storageError.message);
        throw new Error(`Failed to delete resume file from storage: ${storageError.message}`);
    }
  }

  const { error: dbError } = await supabase.from('resumes').delete().eq('id', resumeId).eq('user_id', user.id);
  
  if (dbError) {
     console.error("Supabase db delete error:", dbError.message);
     throw new Error(`Failed to delete resume from database: ${dbError.message}`);
  }

  return { success: true };
}

/**
 * Saves a job and its match report to the user's document in Supabase.
 */
export async function saveJob(input: SaveJobInput): Promise<{ jobId: string }> {
    const { jobData, matchReport, accessToken } = SaveJobInputSchema.parse(input);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user } } = await supabase.auth.getUser(accessToken);

    if (!user) {
        throw new Error('You must be logged in to save a job.');
    }
    
    const { data, error } = await supabase
        .from('saved-jobs')
        .insert({
            user_id: user.id,
            ...jobData,
            match_report: matchReport,
        })
        .select('id')
        .single();
    
    if (error) {
        console.error("Supabase save error in saveJob:", error.message);
        throw new Error(`Failed to save job to database: ${error.message}`);
    }

    return { jobId: data.id };
}
