
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Search, Download, FileText, Lightbulb, ThumbsUp, XCircle, AlertTriangle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getResumes, type Resume } from '@/app/actions/resume-actions';
import { jdResumeSimilarityMatching, type JdResumeSimilarityMatchingOutput } from '@/ai/flows/jd-resume-similarity-matching';

const formSchema = z.object({
  resumeId: z.string().min(1, 'Please select a resume.'),
  jobDescription: z.string().min(50, 'Please paste the full job description.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function JdMatcherPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analysisResult, setAnalysisResult] = useState<JdResumeSimilarityMatchingOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resumeId: '',
      jobDescription: '',
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
          console.error("Failed to fetch resumes:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch your saved resumes.",
          });
        }
      };
      fetchResumes();
    }
  }, [userEmail, toast]);

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setAnalysisResult(null);

    const selectedResume = resumes.find(r => r.id === values.resumeId);
    if (!selectedResume) {
      toast({
        variant: 'destructive',
        title: 'Resume not found',
        description: 'Please select a valid resume.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await jdResumeSimilarityMatching({
        resumeText: selectedResume.content,
        jobDescriptionText: values.jobDescription,
      });
      setAnalysisResult(result);
    } catch (error) {
      console.error('Error matching resume:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">JD–Resume Similarity Matching</CardTitle>
          <CardDescription>
            Get a percentage match score for your resume against a job description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="resumeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Your Resume</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={resumes.length === 0}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paste Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full job description here..."
                        className="min-h-[250px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> Match Resume</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 sticky top-6">
        <CardHeader>
          <CardTitle className="font-headline">Analysis Report</CardTitle>
          <CardDescription>
            Your resume's match score and feedback will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center h-full p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">The AI is analyzing your match...</p>
              </motion.div>
            )}

            {!isLoading && !analysisResult && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-xl">Ready for Analysis</h3>
                <p className="text-muted-foreground">Select a resume and paste a job description to get started.</p>
              </motion.div>
            )}

            {!isLoading && analysisResult && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="space-y-2 text-center p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-lg">Similarity Score</h4>
                    <div className="relative w-32 h-32 mx-auto">
                        <Progress value={analysisResult.score} className="absolute inset-0 w-full h-full rounded-full" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-bold text-3xl text-primary-foreground">{analysisResult.score}<span className="text-base">%</span></span>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="suggestions" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="suggestions"><Lightbulb className="mr-2" />Suggestions</TabsTrigger>
                        <TabsTrigger value="strengths"><ThumbsUp className="mr-2" />Strengths</TabsTrigger>
                        <TabsTrigger value="gaps"><XCircle className="mr-2" />Keyword Gaps</TabsTrigger>
                    </TabsList>
                    <TabsContent value="suggestions" className="mt-4 p-4 bg-accent/10 rounded-md max-h-80 overflow-y-auto">
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            {analysisResult.suggestions.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </TabsContent>
                    <TabsContent value="strengths" className="mt-4 p-4 bg-accent/10 rounded-md max-h-80 overflow-y-auto">
                         <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            {analysisResult.strengths.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </TabsContent>
                    <TabsContent value="gaps" className="mt-4 p-4 bg-accent/10 rounded-md max-h-80 overflow-y-auto">
                         <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            {analysisResult.keywordGaps.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
