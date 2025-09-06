
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Upload, FileText, CheckCircle, XCircle, AlertCircle, TrendingUp, BookOpen, ExternalLink } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getResumes, type Resume } from '@/app/actions/resume-actions';
import { skillGapCareerPathRecommendations } from '@/ai/flows/skill-gap-career-path-recommendations';
import type { SkillGapCareerPathOutput } from '@/ai/schemas/skill-gap-schemas';

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
  jobDescription: z.string().min(50, 'Please paste or upload a job description.'),
}).refine(data => data.resumeId || data.resumeFile || (data.resumeText && data.resumeText.length > 50), {
    message: "Please select, upload, or paste a resume.",
    path: ["resumeId"],
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function CareerPathPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analysisResult, setAnalysisResult] = useState<SkillGapCareerPathOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobDescription: '',
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
    setAnalysisResult(null);

    try {
        let resumeText = '';
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

      const result = await skillGapCareerPathRecommendations({
        resumeText: resumeText,
        jobDescriptionText: values.jobDescription,
      });
      setAnalysisResult(result);
    } catch (error: any) {
      console.error('Error in analysis:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
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
          <CardTitle className="font-headline">Skill Gap & Career Path</CardTitle>
          <CardDescription>
            Analyze skill gaps against a job and get a long-term career roadmap.
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
                </TabsContent>
                <TabsContent value="upload" className="pt-4">
                   <FormField
                    control={form.control}
                    name="resumeFile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upload Resume (PDF or TXT)</FormLabel>
                        <FormControl>
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
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paste Target Job Description</FormLabel>
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
                  <><Sparkles className="mr-2 h-4 w-4" /> Analyze</>
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
            Your skill gap analysis and career path will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center h-full p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">The AI is analyzing your career trajectory...</p>
              </motion.div>
            )}

            {!isLoading && !analysisResult && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-xl">Ready for Analysis</h3>
                <p className="text-muted-foreground">Provide your resume and a job description to get started.</p>
              </motion.div>
            )}

            {!isLoading && analysisResult && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                 <Tabs defaultValue="skill-gap" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="skill-gap">Skill Gap Analysis</TabsTrigger>
                        <TabsTrigger value="career-path">Career Path</TabsTrigger>
                    </TabsList>
                    <TabsContent value="skill-gap" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader className="flex-row items-center gap-2 space-y-0">
                                <CheckCircle className="text-green-500" />
                                <CardTitle className="text-lg">Skills You Have</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {analysisResult.skillGapAnalysis.have.map(skill => <span key={skill} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{skill}</span>)}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex-row items-center gap-2 space-y-0">
                                <XCircle className="text-red-500" />
                                <CardTitle className="text-lg">Missing Skills</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {analysisResult.skillGapAnalysis.missing.map(skill => <span key={skill} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{skill}</span>)}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex-row items-center gap-2 space-y-0">
                                <AlertCircle className="text-amber-500" />
                                <CardTitle className="text-lg">Weak Areas</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                               {analysisResult.skillGapAnalysis.weak.map(skill => <span key={skill} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{skill}</span>)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="career-path" className="mt-4 space-y-4">
                       {analysisResult.careerPath.map((step, index) => (
                           <Card key={index}>
                               <CardHeader>
                                   <div className="flex justify-between items-center">
                                       <CardTitle className="text-lg flex items-center gap-2"><TrendingUp/> {step.role}</CardTitle>
                                       <span className="text-sm font-medium text-muted-foreground">{step.timeline}</span>
                                   </div>
                               </CardHeader>
                               <CardContent className="space-y-3 text-sm">
                                   <div>
                                       <h4 className="font-semibold">Required Skills:</h4>
                                       <p className="text-muted-foreground">{step.requiredSkills.join(', ')}</p>
                                   </div>
                                    <div>
                                       <h4 className="font-semibold">Certifications/Courses:</h4>
                                       <p className="text-muted-foreground">{step.certifications.join(', ')}</p>
                                   </div>
                                   <div>
                                       <h4 className="font-semibold flex items-center gap-2"><BookOpen/> Learning Resources:</h4>
                                       <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                           {step.resources.map((res, i) => (
                                              <li key={i}>
                                                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                      {res.name}
                                                      <ExternalLink className="h-3 w-3" />
                                                  </a>
                                              </li>
                                           ))}
                                       </ul>
                                   </div>
                               </CardContent>
                           </Card>
                       ))}
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
