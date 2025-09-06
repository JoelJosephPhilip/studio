
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, Briefcase, ThumbsUp, ThumbsDown, Save, ExternalLink } from 'lucide-react';

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

const formSchema = z.object({
  resumeId: z.string().min(1, 'Please select a resume.'),
  role: z.string().min(2, 'Please enter a job role.'),
  location: z.string().min(2, 'Please enter a location.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

// Mock job data as we can't call external APIs
const mockJobs = [
    { id: '1', title: 'Senior Product Manager', company: 'Innovate Inc.', location: 'San Francisco, CA', description: 'Lead the development of our flagship product...', url: '#' },
    { id: '2', title: 'Frontend Developer (React)', company: 'Creative Solutions', location: 'Remote', description: 'Build beautiful and responsive user interfaces...', url: '#' },
    { id: '3', title: 'Data Scientist', company: 'Analytics Corp', location: 'New York, NY', description: 'Analyze large datasets to extract meaningful insights...', url: '#' },
    { id: '4', title: 'Cloud Solutions Architect', company: 'CloudBase', location: 'Austin, TX', description: 'Design and implement scalable cloud infrastructure on AWS...', url: '#' },
];

type EnrichedJob = (typeof mockJobs)[0] & {
  matchReport?: JdResumeSimilarityMatchingOutput;
  isSaving?: boolean;
};


export default function JobSearchPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [enrichedJobs, setEnrichedJobs] = useState<EnrichedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: '',
      location: '',
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

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setEnrichedJobs([]);
    
    const selectedResume = resumes.find(r => r.id === values.resumeId);
    if (!selectedResume) {
        toast({ variant: 'destructive', title: 'Resume not found' });
        setIsLoading(false);
        return;
    }

    try {
        const jobsWithScores = await Promise.all(
            mockJobs.map(async (job) => {
                const matchReport = await jdResumeSimilarityMatching({
                    resumeText: selectedResume.content,
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-end">
                <FormField
                    control={form.control}
                    name="resumeId"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Resume for Matching</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={resumes.length === 0}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={resumes.length > 0 ? 'Select a saved resume' : 'No resumes found'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {resumes.map(resume => (
                              <SelectItem key={resume.id} value={resume.id}>{resume.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                />
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
                      <FormItem className="flex-grow">
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Remote" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                />
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                <span className="ml-2">Search Jobs</span>
              </Button>
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
