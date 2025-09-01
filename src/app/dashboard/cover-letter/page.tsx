'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Download, FileText, Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateCoverLetter } from '@/ai/flows/cover-letter-builder';

const formSchema = z.object({
  resumeText: z.string().min(50, 'Please paste your full resume.'),
  jobDescription: z.string().min(50, 'Please paste the job description.'),
  jobTitle: z.string().min(2, 'Job title is required.'),
  companyName: z.string().min(2, 'Company name is required.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function CoverLetterPage() {
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resumeText: '',
      jobDescription: '',
      jobTitle: '',
      companyName: '',
    },
  });

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setGeneratedLetter(null);

    try {
      const result = await generateCoverLetter({
        resumeText: values.resumeText,
        jobDescription: values.jobDescription,
        jobTitle: values.jobTitle,
        companyName: values.companyName,
      });
      setGeneratedLetter(result.coverLetter);
      toast({
        title: 'Cover Letter Generated!',
        description: 'Your personalized cover letter is ready.',
      });
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const downloadLetter = () => {
    if (!generatedLetter) return;
    const blob = new Blob([generatedLetter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cover_letter_${form.getValues('companyName').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Cover Letter Builder</CardTitle>
          <CardDescription>
            Auto-generate a compelling cover letter from your resume and a job
            description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior Product Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Google" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="resumeText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Resume Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full text of your resume here..."
                        className="min-h-[150px]"
                        {...field}
                      />
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
                    <FormLabel>Job Description Text</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full job description here..."
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 sticky top-6">
        <CardHeader>
          <CardTitle className="font-headline">Generated Letter</CardTitle>
          <CardDescription>
            Your AI-generated cover letter will appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-full">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center h-full p-12"
              >
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  The AI is writing your letter...
                </p>
              </motion.div>
            )}

            {!isLoading && !generatedLetter && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]"
              >
                <Wand2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-xl">Ready to Write</h3>
                <p className="text-muted-foreground">
                  Fill in the details to generate your cover letter.
                </p>
              </motion.div>
            )}

            {!isLoading && generatedLetter && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <Textarea
                  readOnly
                  value={generatedLetter}
                  className="min-h-[500px] text-sm bg-muted/20"
                />
                <Button onClick={downloadLetter}>
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
