
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Languages, Download, Upload } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getResumes, type Resume } from '@/app/actions/resume-actions';
import { multilingualResumeGenerator } from '@/ai/flows/multilingual-resume-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

// Setup for PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

const languages = [
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'hi', name: 'Hindi' },
];

const formSchema = z.object({
  resumeId: z.string().optional(),
  resumeFile: z.any().optional(),
  targetLanguage: z.string().min(1, 'Please select a target language.'),
}).refine(data => data.resumeId || data.resumeFile, {
    message: "Please select or upload a resume.",
    path: ["resumeId"],
});


type FormSchemaType = z.infer<typeof formSchema>;

export default function TranslatePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [translatedResume, setTranslatedResume] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingResumes, setIsFetchingResumes] = useState(true);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [user] = useAuthState(auth);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  });
  
  const userEmail = session?.user?.email || user?.email;

  useEffect(() => {
    if (userEmail) {
      const fetchResumes = async () => {
        setIsFetchingResumes(true);
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
        } finally {
            setIsFetchingResumes(false);
        }
      };
      fetchResumes();
    } else {
        setIsFetchingResumes(false);
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
    setTranslatedResume(null);

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
      
      if (!resumeText) {
         toast({ variant: 'destructive', title: 'Error', description: 'Could not get resume content.' });
         setIsLoading(false);
         return;
      }

      const result = await multilingualResumeGenerator({
        resumeText: resumeText,
        targetLanguage: values.targetLanguage,
      });

      setTranslatedResume(result.translatedResume);
      toast({
        title: 'Translation Complete!',
        description: `Your resume has been translated to ${values.targetLanguage}.`,
      });
    } catch (error: any) {
      console.error('Error translating resume:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const downloadAsTxt = () => {
    if (!translatedResume) return;
    const blob = new Blob([translatedResume], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const lang = form.getValues('targetLanguage');
    link.href = url;
    link.download = `resume_${lang}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Multilingual Resume Generator</CardTitle>
          <CardDescription>
            Translate your saved resumes into multiple languages with culturally correct formatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-2">
                <FormLabel>Your Resume</FormLabel>
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
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue('resumeFile', undefined);
                                    setResumeFileName(null);
                                    form.clearErrors('resumeId');
                                }} defaultValue={field.value} disabled={isFetchingResumes || resumes.length === 0}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder={
                                        isFetchingResumes ? "Loading resumes..." : "Select a saved resume"
                                    } />
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
                 </Tabs>
                 <FormMessage>{form.formState.errors.resumeId?.message}</FormMessage>
              </div>

              <FormField
                control={form.control}
                name="targetLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a language to translate to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.code} value={lang.name}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Translating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Translation</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg-col-span-1 sticky top-6">
        <CardHeader>
          <CardTitle className="font-headline">Translated Resume</CardTitle>
          <CardDescription>
            Your translated resume will appear here after generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center h-full p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">The AI is translating and localizing...</p>
              </motion.div>
            )}

            {!isLoading && !translatedResume && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]">
                <Languages className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-xl">Ready to Translate</h3>
                <p className="text-muted-foreground">Select a resume and a language to begin.</p>
              </motion.div>
            )}

            {!isLoading && translatedResume && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Textarea
                  readOnly
                  value={translatedResume}
                  className="min-h-[500px] text-sm bg-muted/20"
                />
                <Button onClick={downloadAsTxt}>
                  <Download className="mr-2 h-4 w-4" />
                  Download as .txt
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

    