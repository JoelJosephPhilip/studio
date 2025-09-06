
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Search, FileText, Lightbulb, ThumbsUp, XCircle, Upload, Download } from 'lucide-react';
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from 'jspdf';

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
import { Input } from '@/components/ui/input';

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

export default function JdMatcherPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analysisResult, setAnalysisResult] = useState<JdResumeSimilarityMatchingOutput | null>(null);
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

      const result = await jdResumeSimilarityMatching({
        resumeText: resumeText,
        jobDescriptionText: values.jobDescription,
      });
      setAnalysisResult(result);
    } catch (error: any) {
      console.error('Error matching resume:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const downloadReportAsPdf = () => {
    if (!analysisResult) return;
    const doc = new jsPDF();
    const margin = 15;
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("JD-Resume Match Analysis Report", margin, yPos);
    yPos += 15;

    doc.setFontSize(16);
    doc.text(`Overall Similarity Score: ${analysisResult.score}%`, margin, yPos);
    yPos += 15;

    const addSection = (title: string, items: string[]) => {
      if (yPos > pageHeight - margin * 2) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(title, margin, yPos);
      yPos += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      items.forEach(item => {
        const splitText = doc.splitTextToSize(`• ${item}`, doc.internal.pageSize.getWidth() - margin * 2);
        if (yPos + (splitText.length * 5) > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
        doc.text(splitText, margin + 5, yPos);
        yPos += splitText.length * 5 + 2;
      });
      yPos += 5; // Extra space after a section
    };
    
    addSection("Suggestions for Improvement", analysisResult.suggestions);
    addSection("Your Strengths", analysisResult.strengths);
    addSection("Keyword Gaps", analysisResult.keywordGaps);

    doc.save("jd_match_report.pdf");
  };

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
                <p className="text-muted-foreground">Provide your resume and a job description to get started.</p>
              </motion.div>
            )}

            {!isLoading && analysisResult && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="space-y-2 text-center p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-lg">Similarity Score</h4>
                    <div className="relative w-32 h-32 mx-auto">
                        <Progress value={analysisResult.score} className="absolute inset-0 w-full h-full rounded-full" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-bold text-3xl text-primary">{analysisResult.score}<span className="text-base">%</span></span>
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
                <Button onClick={downloadReportAsPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Report as PDF
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
