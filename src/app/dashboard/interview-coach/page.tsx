
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, FileText, Upload, RefreshCw } from 'lucide-react';
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
import { generateInterviewPrepPack } from '@/ai/flows/ai-interview-coach';
import type { AiInterviewCoachOutput } from '@/ai/schemas/ai-interview-coach-schemas';
import { generateMoreQuestions } from '@/ai/flows/generate-more-questions';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { generateMcqsForTopic } from '@/ai/flows/generate-mcqs-for-topic';


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
  jobTitle: z.string().min(2, 'Please enter a job title.'),
  jobDescription: z.string().optional(),
}).refine(data => data.resumeId || data.resumeFile || (data.resumeText && data.resumeText.length > 50), {
    message: "Please select, upload, or paste a resume.",
    path: ["resumeId"],
});


type FormSchemaType = z.infer<typeof formSchema>;

function McqItem({ mcq, index }: { mcq: AiInterviewCoachOutput['mcqs'][0], index: number }) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const isCorrect = selectedValue === mcq.correctAnswer;

  return (
    <div className="text-sm p-4 border rounded-lg space-y-3">
        <p className="font-semibold">{index + 1}. {mcq.question}</p>
        <RadioGroup onValueChange={setSelectedValue} disabled={showAnswer}>
            {mcq.options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`q${index}-o${i}`} />
                    <Label htmlFor={`q${index}-o${i}`} className={cn(
                        showAnswer && option === mcq.correctAnswer && "text-green-600 font-bold",
                        showAnswer && selectedValue === option && option !== mcq.correctAnswer && "text-red-600 line-through"
                    )}>
                        {option}
                    </Label>
                </div>
            ))}
        </RadioGroup>
        <div className="flex items-center gap-4">
            <Button size="sm" variant="outline" onClick={() => setShowAnswer(true)} disabled={!selectedValue}>
                Check Answer
            </Button>
            {showAnswer && (
                <div className="flex items-center gap-1 font-semibold">
                    {isCorrect ? (
                        <span className="text-green-600">Correct!</span>
                    ) : (
                        <span className="text-red-600">Incorrect. The correct answer is highlighted.</span>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}

type LoadingMoreState = {
    behavioral: boolean;
    technical: boolean;
    mcq: boolean;
};


export default function InterviewCoachPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [prepPack, setPrepPack] = useState<AiInterviewCoachOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<LoadingMoreState>({ behavioral: false, technical: false, mcq: false });
  const [mcqTopic, setMcqTopic] = useState('');
  const [isGeneratingTopicMcqs, setIsGeneratingTopicMcqs] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [currentResumeText, setCurrentResumeText] = useState<string | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: '',
      resumeText: '',
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

  const getResumeTextFromForm = async (): Promise<string> => {
    const values = form.getValues();
    if (values.resumeText && values.resumeText.length > 50) {
        return values.resumeText;
    }
    if (values.resumeFile) {
        const file = values.resumeFile as File;
        return await extractTextFromFile(file);
    }
    if (values.resumeId) {
        const selectedResume = resumes.find(r => r.id === values.resumeId);
        if (!selectedResume) throw new Error("Selected resume not found.");
        return selectedResume.content;
    }
    throw new Error("No resume source selected.");
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
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
    setPrepPack(null);
    setCurrentResumeText(null);

    try {
      const resumeText = await getResumeTextFromForm();
      setCurrentResumeText(resumeText); // Store the resume text in state
      const result = await generateInterviewPrepPack({
        resumeText: resumeText,
        jobTitle: values.jobTitle,
        jobDescription: values.jobDescription,
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
  
  const handleGenerateMore = async (category: keyof LoadingMoreState) => {
    if (!prepPack || !currentResumeText) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot generate more questions without an initial prep pack.',
      });
      return;
    };

    setLoadingMore(prev => ({ ...prev, [category]: true }));

    try {
        const { jobTitle, jobDescription } = form.getValues();
        
        let existingQuestions: string[] = [];
        if (category === 'behavioral' || category === 'technical') {
            existingQuestions = prepPack[category].map(q => q.question);
        } else if (category === 'mcq') {
            existingQuestions = prepPack.mcqs.map(q => q.question);
        }

        const result = await generateMoreQuestions({
            resumeText: currentResumeText,
            jobTitle,
            jobDescription,
            category,
            existingQuestions,
        });

        setPrepPack(prev => {
            if (!prev) return null;
            const newPack = { ...prev };
            if (result.behavioral) {
                newPack.behavioral = [...newPack.behavioral, ...result.behavioral];
            }
            if (result.technical) {
                newPack.technical = [...newPack.technical, ...result.technical];
            }
            if (result.mcqs) {
                newPack.mcqs = [...newPack.mcqs, ...result.mcqs];
            }
            return newPack;
        });

    } catch (error: any) {
        console.error(`Error generating more ${category} questions:`, error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: `Could not generate more ${category} questions. Please try again.`,
        });
    } finally {
        setLoadingMore(prev => ({ ...prev, [category]: false }));
    }
  };

  const handleGenerateTopicMcqs = async () => {
    if (!mcqTopic) return;
    
    setIsGeneratingTopicMcqs(true);
    if (!prepPack) { // If no prep pack exists, create one
        setPrepPack({
            behavioral: [],
            technical: [],
            mcqs: [],
            feedback: { strengths: [], areasForImprovement: [] }
        });
    }

    try {
        const existingQuestions = prepPack?.mcqs.map(q => q.question) || [];
        const result = await generateMcqsForTopic({
            topic: mcqTopic,
            existingQuestions,
        });

        setPrepPack(prev => {
             const newMcqs = [...(prev?.mcqs || []), ...result.mcqs];
             if (prev) {
                return { ...prev, mcqs: newMcqs };
             }
             return {
                behavioral: [],
                technical: [],
                mcqs: newMcqs,
                feedback: { strengths: [], areasForImprovement: [] }
             }
        });
        setMcqTopic(''); // Clear input after generation
        toast({
            title: 'MCQs Generated!',
            description: `New questions for ${mcqTopic} have been added to the report.`
        });

    } catch (error: any) {
        console.error(`Error generating MCQs for topic ${mcqTopic}:`, error);
        toast({
            variant: 'destructive',
            title: 'MCQ Generation Failed',
            description: `Could not generate questions for ${mcqTopic}. Please try again.`,
        });
    } finally {
        setIsGeneratingTopicMcqs(false);
    }
  };

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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="select" onClick={() => {
                        form.setValue('resumeFile', undefined);
                        form.setValue('resumeText', '');
                        setResumeFileName(null);
                    }}>Select Saved</TabsTrigger>
                    <TabsTrigger value="upload" onClick={() => {
                        form.setValue('resumeId', undefined);
                        form.setValue('resumeText', '');
                    }}>Upload New</TabsTrigger>
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
                        <FormLabel>Select Your Resume</FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('resumeFile', undefined);
                            form.setValue('resumeText', '');
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
                 <TabsContent value="paste" className="pt-4">
                  <FormField
                      control={form.control}
                      name="resumeText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Paste Your Resume</FormLabel>
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

              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the job description here for more accurate questions..."
                        className="min-h-[150px]"
                        {...field}
                      />
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

          <Separator className="my-6" />

          <div className="space-y-3">
            <Label htmlFor="mcq-topic" className="font-semibold">Generate MCQs for a specific topic</Label>
            <div className="flex gap-2">
                <Input 
                    id="mcq-topic"
                    placeholder="e.g., React, Kubernetes, Python"
                    value={mcqTopic}
                    onChange={(e) => setMcqTopic(e.target.value)}
                    disabled={isGeneratingTopicMcqs}
                />
                <Button onClick={handleGenerateTopicMcqs} disabled={isGeneratingTopicMcqs || !mcqTopic}>
                    {isGeneratingTopicMcqs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Generate questions for a topic. They will be added to your prep pack below.
            </p>
          </div>

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
                
                {prepPack.feedback.strengths.length > 0 && (
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
                )}
                
                {(prepPack.behavioral.length > 0 || prepPack.technical.length > 0 || prepPack.mcqs.length > 0) && <Separator />}
                
                <Tabs defaultValue="behavioral" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="behavioral" disabled={prepPack.behavioral.length === 0}>Behavioral</TabsTrigger>
                        <TabsTrigger value="technical" disabled={prepPack.technical.length === 0}>Technical</TabsTrigger>
                        <TabsTrigger value="mcq" disabled={prepPack.mcqs.length === 0}>Multiple Choice</TabsTrigger>
                    </TabsList>
                    <TabsContent value="behavioral" className="pt-4 space-y-4">
                      <Accordion type="single" collapsible className="w-full">
                        {prepPack.behavioral.map((item, index) => (
                          <AccordionItem value={`b-${index}`} key={`b-${index}`}>
                            <AccordionTrigger>{item.question}</AccordionTrigger>
                            <AccordionContent className="whitespace-pre-wrap text-muted-foreground text-sm">{item.sampleAnswer}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      <Button variant="outline" size="sm" disabled={loadingMore.behavioral} onClick={() => handleGenerateMore('behavioral')}>
                        {loadingMore.behavioral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generate More
                      </Button>
                    </TabsContent>
                    <TabsContent value="technical" className="pt-4 space-y-4">
                      <Accordion type="single" collapsible className="w-full">
                        {prepPack.technical.map((item, index) => (
                          <AccordionItem value={`t-${index}`} key={`t-${index}`}>
                            <AccordionTrigger>{item.question}</AccordionTrigger>
                            <AccordionContent className="whitespace-pre-wrap text-muted-foreground text-sm">{item.sampleAnswer}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                       <Button variant="outline" size="sm" disabled={loadingMore.technical} onClick={() => handleGenerateMore('technical')}>
                        {loadingMore.technical ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Generate More
                      </Button>
                    </TabsContent>
                    <TabsContent value="mcq" className="pt-4 space-y-4">
                       {prepPack.mcqs.length === 0 && (
                         <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[200px]">
                            <h3 className="font-bold text-lg">No MCQs Generated</h3>
                            <p className="text-muted-foreground text-sm">Use the form above to generate MCQs for a specific topic.</p>
                         </div>
                       )}
                       {prepPack.mcqs.map((mcq, index) => (
                          <McqItem key={index} mcq={mcq} index={index} />
                       ))}
                       {prepPack.mcqs.length > 0 && (
                          <Button variant="outline" size="sm" disabled={loadingMore.mcq} onClick={() => handleGenerateMore('mcq')}>
                            {loadingMore.mcq ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Generate More
                          </Button>
                       )}
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
