
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, FileText, Upload } from 'lucide-react';
import * as pdfjsLib from "pdfjs-dist";

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
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getResumes, type Resume } from '@/app/actions/resume-actions';
import { generateInterviewPrepPack, type AiInterviewCoachOutput } from '@/ai/flows/ai-interview-coach';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  jobTitle: z.string().min(2, 'Please enter a job title.'),
}).refine(data => data.resumeId || data.resumeFile, {
    message: "Please select or upload a resume.",
    path: ["resumeId"],
});


type FormSchemaType = z.infer<typeof formSchema>;

export default function InterviewCoachPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [prepPack, setPrepPack] = useState<AiInterviewCoachOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: '',
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
      setResumeFileName(file.name);
      form.clearErrors('resumeId');
    }
  };

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setPrepPack(null);

    try {
        let resumeText = '';
        if (values.resumeFile) {
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

      const result = await generateInterviewPrepPack({
        resumeText: resumeText,
        jobTitle: values.jobTitle,
      });
      setPrepPack(result);
    } catch (error: any) {
      console.error('Error generating prep pack:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Interview Coach</CardTitle>
          <CardDescription>
            Get personalized interview questions and sample answers based on your resume.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="select" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="select" onClick={() => {
                        form.setValue('resumeFile', undefined);
                        setResumeFileName(null);
                    }}>Select Saved</TabsTrigger>
                    <TabsTrigger value="upload" onClick={() => {
                        form.setValue('resumeId', undefined);
                    }}>Upload New</TabsTrigger>
                </TabsList>
                <TabsContent value="select" className="pt-4">
                  <FormField
                    control={form.control}
                    name="resumeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Your Resume</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('resumeFile', undefined);
                            setResumeFileName(null);
                            form.clearErrors('resumeId');
                        }} defaultValue={field.value} disabled={resumes.length === 0}>
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
                </TabsContent>
                <TabsContent value="upload" className="pt-4">
                   <FormField
                    control={form.control}
                    name="resumeFile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Resume (PDF or TXT)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                             <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                disabled={isLoading}
                                onClick={() => resumeFileInputRef.current?.click()}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {resumeFileName || "Upload from Device"}
                              </Button>
                          </div>
                        </FormControl>
                         <Input
                            type="file"
                            className="hidden"
                            ref={resumeFileInputRef}
                            onChange={handleResumeFileChange}
                            accept=".pdf,.txt"
                          />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title You're Applying For</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Product Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Prep Pack...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Get Questions</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 sticky top-6">
        <CardHeader>
          <CardTitle className="font-headline">Your Interview Prep Pack</CardTitle>
          <CardDescription>
            Questions and feedback will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center h-full p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">The AI is preparing your questions...</p>
              </motion.div>
            )}

            {!isLoading && !prepPack && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-xl">Ready to Prepare</h3>
                <p className="text-muted-foreground">Select your resume and a job title to get started.</p>
              </motion.div>
            )}

            {!isLoading && prepPack && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Feedback Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-4 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2 mb-2 text-green-700 dark:text-green-400"><ThumbsUp/>Strengths to Highlight</h4>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {prepPack.feedback.strengths.map((item, i) => <li key={`s-${i}`}>{item}</li>)}
                            </ul>
                        </div>
                        <div className="p-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400"><ThumbsDown/>Areas to Prepare</h4>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                {prepPack.feedback.areasForImprovement.map((item, i) => <li key={`a-${i}`}>{item}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Behavioral Questions</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {prepPack.behavioral.map((item, index) => (
                      <AccordionItem value={`b-${index}`} key={`b-${index}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent className="whitespace-pre-wrap text-muted-foreground text-sm">{item.sampleAnswer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Technical & Situational Questions</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {prepPack.technical.map((item, index) => (
                      <AccordionItem value={`t-${index}`} key={`t-${index}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent className="whitespace-pre-wrap text-muted-foreground text-sm">{item.sampleAnswer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

    