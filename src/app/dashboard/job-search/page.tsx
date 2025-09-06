
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, Briefcase, ThumbsUp, ThumbsDown, Save, ExternalLink, Upload } from 'lucide-react';
import * as pdfjsLib from "pdfjs-dist";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getResumes, type Resume, saveJob } from '@/app/actions/resume-actions';
import { jdResumeSimilarityMatching, type JdResumeSimilarityMatchingOutput } from '@/ai/flows/jd-resume-similarity-matching';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Setup for PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

const formSchema = z.object({
  resumeId: z.string().optional(),
  resumeFile: z.any().optional(),
  resumeText: z.string().optional(),
  role: z.string().min(2, 'Please enter a job role.'),
  location: z.string().min(2, 'Please enter a location.'),
}).refine(data => data.resumeId || data.resumeFile || (data.resumeText && data.resumeText.length > 50), {
    message: "Please select, upload, or paste a resume.",
    path: ["resumeId"],
});

type FormSchemaType = z.infer<typeof formSchema>;

// Mock job data with realistic URLs
const mockJobs = [
    { id: '1', title: 'Senior Product Manager', company: 'Innovate Inc.', location: 'San Francisco, CA', description: 'Lead the development of our flagship product...', url: 'https://careers.google.com/jobs' },
    { id: '2', title: 'Frontend Developer (React)', company: 'Creative Solutions', location: 'Remote', description: 'Build beautiful and responsive user interfaces...', url: 'https://www.linkedin.com/jobs' },
    { id: '3', title: 'Data Scientist', company: 'Analytics Corp', location: 'New York, NY', description: 'Analyze large datasets to extract meaningful insights...', url: 'https://www.indeed.com/q-Data-Scientist-jobs.html' },
    { id: '4', title: 'Cloud Solutions Architect', company: 'CloudBase', location: 'Austin, TX', description: 'Design and implement scalable cloud infrastructure on AWS...', url: 'https://www.amazon.jobs/en/job_categories/solutions-architect' },
];

type EnrichedJob = (typeof mockJobs)[0] & {
  matchReport?: JdResumeSimilarityMatchingOutput;
  isSaving?: boolean;
};


export default function JobSearchPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [enrichedJobs, setEnrichedJobs] = useState<EnrichedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: '',
      location: '',
      resumeText: '',
    },
  });

  const userEmail = session?.user?.email || user?.email;

  useEffect(() => {
    if (userEmail) {
      const fetchResumes = async () => {
        try {
          const userResumes = await getResumes({ userEmail });
          setResumes(userResumes);
        } catch (error) {
          console.error('Failed to fetch resumes:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch your saved resumes.',
          });
        }
      };
      fetchResumes();
    }
  }, [userEmail, toast]);

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => ('str' in item ? item.str : '')).join(' ');
      }
      return text;
    } else if (file.type === 'text/plain') {
      return file.text();
    } else {
      throw new Error("Unsupported file type. Please upload a PDF or TXT file.");
    }
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('resumeFile', file);
      form.setValue('resumeId', undefined); // Clear selected resume
      form.setValue('resumeText', ''); // Clear pasted text
      setResumeFileName(file.name);
      form.clearErrors('resumeId');
    }
  };

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setEnrichedJobs([]);
    
    let resumeText = '';
    try {
        if (values.resumeText && values.resumeText.length > 50) {
            resumeText = values.resumeText;
        } else if (values.resumeFile) {
            const file = values.resumeFile as File;
            resumeText = await extractTextFromFile(file);
        } else if (values.resumeId) {
            const selectedResume = resumes.find(r => r.id === values.resumeId);
            if (!selectedResume) {
                toast({ variant: 'destructive', title: 'Resume not found' });
                setIsLoading(false);
                return;
            }
            resumeText = selectedResume.content;
        }

        const jobsWithScores = await Promise.all(
            mockJobs.map(async (job) => {
                const matchReport = await jdResumeSimilarityMatching({
                    resumeText: resumeText,
                    jobDescriptionText: `${job.title} at ${job.company}. ${job.description}`,
                });
                return { ...job, matchReport };
            })
        );
        setEnrichedJobs(jobsWithScores.sort((a, b) => (b.matchReport?.score || 0) - (a.matchReport?.score || 0)));
    } catch (error) {
        console.error("Error enriching jobs:", error);
        toast({ variant: "destructive", title: "Analysis Failed", description: "Could not analyze jobs. Please try again." });
    } finally {
        setIsLoading(false);
    }
  }

  const handleSaveJob = async (job: EnrichedJob) => {
    if (!userEmail || !job.matchReport) return;
    
    setEnrichedJobs(jobs => jobs.map(j => j.id === job.id ? { ...j, isSaving: true } : j));

    try {
        await saveJob({
            userEmail,
            jobData: {
                source: 'Mock API',
                title: job.title,
                company: job.company,
                location: job.location,
                url: job.url,
            },
            matchReport: job.matchReport,
        });
        toast({ title: "Job Saved!", description: `${job.title} at ${job.company} has been saved.` });
    } catch (error) {
        console.error("Error saving job:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save the job." });
    } finally {
        setEnrichedJobs(jobs => jobs.map(j => j.id === job.id ? { ...j, isSaving: false } : j));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Job Search Aggregator</CardTitle>
          <CardDescription>
            Find jobs from multiple platforms and get suggestions based on your resume.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className='space-y-2'>
                <FormLabel>Resume for Matching</FormLabel>
                <Tabs defaultValue="select" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="select" onClick={() => {
                            form.setValue('resumeFile', undefined);
                            form.setValue('resumeText', '');
                            setResumeFileName(null);
                        }}>Select Saved</TabsTrigger>
                        <TabsTrigger value="upload" onClick={() => {
                            form.setValue('resumeId', undefined);
                            form.setValue('resumeText', '');
                        }}>Upload File</TabsTrigger>
                        <TabsTrigger value="paste" onClick={() => {
                            form.setValue('resumeId', undefined);
                            form.setValue('resumeFile', undefined);
                            setResumeFileName(null);
                        }}>Paste Text</TabsTrigger>
                    </TabsList>
                    <TabsContent value="select" className="pt-4">
                      <FormField
                        control={form.control}
                        name="resumeId"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('resumeFile', undefined);
                                form.setValue('resumeText', '');
                                setResumeFileName(null);
                                form.clearErrors('resumeId');
                            }} defaultValue={field.value} disabled={resumes.length === 0}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={resumes.length > 0 ? "Select a saved resume" : "No resumes found"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {resumes.map(resume => (
                                  <SelectItem key={resume.id} value={resume.id}>{resume.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="upload" className="pt-4">
                      <FormField
                        control={form.control}
                        name="resumeFile"
                        render={() => (
                          <FormItem>
                            <FormControl>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                    disabled={isLoading}
                                    onClick={() => resumeFileInputRef.current?.click()}
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {resumeFileName || "Upload PDF or TXT File"}
                                </Button>
                            </FormControl>
                             <Input
                                type="file"
                                className="hidden"
                                ref={resumeFileInputRef}
                                onChange={handleResumeFileChange}
                                accept=".pdf,.txt"
                              />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    <TabsContent value="paste" className="pt-4">
                      <FormField
                          control={form.control}
                          name="resumeText"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder="Paste the full text of your resume here..."
                                  className="min-h-[150px]"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    form.setValue('resumeId', undefined);
                                    form.setValue('resumeFile', undefined);
                                    setResumeFileName(null);
                                    form.clearErrors('resumeId');
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                    </TabsContent>
                  </Tabs>
                  <FormMessage>{form.formState.errors.resumeId?.message}</FormMessage>
                </div>
              
              <div className="flex flex-col md:flex-row md:gap-4 md:items-end">
                 <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Product Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem className="flex-grow mt-4 md:mt-0">
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Remote" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto mt-4 md:mt-0">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                    <span className="ml-2">Search Jobs</span>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <AnimatePresence>
            {isLoading && (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Searching and analyzing jobs...</p>
                </motion.div>
            )}

            {!isLoading && enrichedJobs.length === 0 && (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[300px]">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-bold text-xl">Find Your Next Opportunity</h3>
                    <p className="text-muted-foreground">Select a resume and search for jobs to see personalized results.</p>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
                {enrichedJobs.map((job) => (
                    <motion.div key={job.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{job.title}</CardTitle>
                                        <CardDescription>{job.company} - {job.location}</CardDescription>
                                    </div>
                                    <div className="text-center flex-shrink-0 ml-4">
                                        <p className="text-xs text-muted-foreground mb-1">Match Score</p>
                                        <div className="relative h-16 w-16">
                                            <Progress value={job.matchReport?.score || 0} className="absolute inset-0 w-full h-full rounded-full" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="font-bold text-lg text-primary">{job.matchReport?.score || 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2">
                                <p className="text-sm font-medium">{job.matchReport?.summary}</p>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"><ThumbsUp className="mr-1 h-3 w-3" />Matches</Badge>
                                    <p className="text-xs text-muted-foreground truncate">{job.matchReport?.matches.join(', ')}</p>
                                </div>
                                <div className="flex gap-2">
                                     <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"><ThumbsDown className="mr-1 h-3 w-3" />Gaps</Badge>
                                     <p className="text-xs text-muted-foreground truncate">{job.matchReport?.gaps.join(', ')}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="ghost" asChild>
                                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2" />
                                        Apply
                                    </a>
                                </Button>
                                <Button onClick={() => handleSaveJob(job)} disabled={job.isSaving}>
                                    {job.isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                                    <span className="ml-2">Save</span>
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
