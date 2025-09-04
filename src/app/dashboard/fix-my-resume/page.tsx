
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, Upload, Download, FileText, CheckCircle, Wand, Save } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import jsPDF from "jspdf";
import { useSession } from "next-auth/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { fixMyResume, type FixMyResumeOutput } from "@/ai/flows/fix-my-resume";
import { Textarea } from "@/components/ui/textarea";
import { saveResumeToDb } from "@/ai/flows/save-resume-to-db";

// Setup for PDF.js worker - updated for Next.js compatibility
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

const formSchema = z.object({
  resumeFile: z.any().refine(file => file instanceof File, "Resume PDF is required."),
  atsReportFile: z.any().refine(file => file instanceof File, "ATS Report file is required."),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function FixMyResumePage() {
  const [analysisResult, setAnalysisResult] = useState<FixMyResumeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const reportFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: session } = useSession();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  });

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
      throw new Error("Unsupported file type.");
    }
  };

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const resumeFile = values.resumeFile as File;
      const atsReportFile = values.atsReportFile as File;

      if (!resumeFile || !atsReportFile) {
        toast({ variant: "destructive", title: "Missing files", description: "Please upload both files." });
        setIsLoading(false);
        return;
      }
      
      const [resumeText, atsReportText] = await Promise.all([
        extractTextFromFile(resumeFile),
        extractTextFromFile(atsReportFile),
      ]);

      const result = await fixMyResume({ resumeText, atsReportText });
      setAnalysisResult(result);
      toast({ title: "Resume Improved!", description: "Your new resume is ready." });

    } catch (error) {
      console.error("Error fixing resume:", error);
      toast({
        variant: "destructive",
        title: "Improvement Failed",
        description: "Something went wrong. Please check the console and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "resumeFile" | "atsReportFile", setFileName: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue(fieldName, file);
      setFileName(file.name);
      form.clearErrors(fieldName);
    }
  };
  
  const downloadAsPdf = () => {
    if (!analysisResult?.improvedResumeText) return;
    const pdf = new jsPDF();
    const text = analysisResult.improvedResumeText;
    const lines = pdf.splitTextToSize(text, 180);
    pdf.text(lines, 15, 15);
    pdf.save("improved_resume.pdf");
  };
  
  const handleSaveResume = async () => {
    if (!analysisResult?.improvedResumeText) return;
    if (!session?.user?.id) {
        toast({
            variant: 'destructive',
            title: 'Not signed in',
            description: 'You must be signed in to save a resume.'
        });
        return;
    }
    
    setIsSaving(true);
    try {
        await saveResumeToDb({
            userId: session.user.id,
            resumeText: analysisResult.improvedResumeText,
            title: `Improved Resume - ${new Date().toLocaleDateString()}`
        });

        toast({
            title: "Successfully Saved!",
            description: "Your improved resume has been saved to your account.",
        });
    } catch (error) {
        console.error("Error saving resume: ", error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "Could not save resume. Please try again.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Wand /> Fix My Resume</CardTitle>
          <CardDescription>Upload your resume and an ATS report, and let AI fix it for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="resumeFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Resume (PDF)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                         <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            disabled={isLoading}
                            onClick={() => resumeFileRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {resumeFileName || "Upload from Device"}
                          </Button>
                      </div>
                    </FormControl>
                     <Input
                        type="file"
                        className="hidden"
                        ref={resumeFileRef}
                        onChange={(e) => handleFileChange(e, "resumeFile", setResumeFileName)}
                        accept=".pdf"
                      />
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               <FormField
                control={form.control}
                name="atsReportFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ATS Report (PDF or TXT)</FormLabel>
                     <FormControl>
                       <div className="space-y-2">
                         <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            disabled={isLoading}
                            onClick={() => reportFileRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {reportFileName || "Upload from Device"}
                          </Button>
                       </div>
                    </FormControl>
                     <Input
                        type="file"
                        className="hidden"
                        ref={reportFileRef}
                        onChange={(e) => handleFileChange(e, "atsReportFile", setReportFileName)}
                        accept=".pdf,.txt"
                      />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Improving Resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Fix My Resume
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1 sticky top-6">
         <CardHeader>
            <CardTitle className="font-headline">Improved Resume</CardTitle>
            <CardDescription>
                Your AI-improved resume and changes will appear below.
            </CardDescription>
        </CardHeader>
        <CardContent className="h-full">
         <AnimatePresence mode="wait">
            {isLoading && (
               <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center h-full p-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">The AI is working its magic...</p>
               </motion.div>
            )}

            {!isLoading && !analysisResult && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-bold text-xl">Ready to Improve</h3>
                <p className="text-muted-foreground">Upload your files to get started.</p>
              </motion.div>
            )}
            
            {!isLoading && analysisResult && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                 <div>
                    <h4 className="font-semibold text-lg flex items-center gap-2 mb-2"><CheckCircle className="text-green-500" /> Summary of Changes</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-accent/20 p-4 rounded-md">
                        {analysisResult.changesSummary.map((change, index) => <li key={index}>{change}</li>)}
                    </ul>
                 </div>
                 <Textarea
                    readOnly
                    value={analysisResult.improvedResumeText}
                    className="min-h-[400px] text-sm"
                 />
                 <div className="flex flex-wrap gap-2">
                    <Button onClick={downloadAsPdf}>
                        <Download className="mr-2 h-4 w-4" />
                        Download as PDF
                    </Button>
                    <Button variant="outline" onClick={handleSaveResume} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? "Saving..." : "Save Resume"}
                    </Button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

    