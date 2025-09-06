
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, Download, Upload, Lightbulb, FileText, Wand2 } from "lucide-react";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { analyzeResumeAts, AnalyzeResumeAtsOutput } from "@/ai/flows/ats-resume-analyzer";
import { analyzeResumeAtsPdf } from "@/ai/flows/ats-resume-analyzer-pdf";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";

// Setup for PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}


const formSchema = z.object({
  resumeText: z.string(),
  resumeFile: z.any().optional(),
}).refine(data => data.resumeText.length > 50 || data.resumeFile, {
  message: "Please paste your full resume text or upload a file.",
  path: ["resumeText"],
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function AtsAnalyzerPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResumeAtsOutput | null>(null);
  const [currentResumeText, setCurrentResumeText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resumeText: "",
    },
  });
  
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => ('str' in item ? item.str : '')).join(' ');
    }
    return text;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    form.setValue("resumeFile", file);
    setFileName(file.name);
    // satisfy validation while file is selected
    form.setValue("resumeText", `File uploaded: ${file.name}`);
    form.clearErrors("resumeText");
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setAnalysisResult(null);
    setCurrentResumeText("");

    try {
      let result;
      let resumeTextForAnalysis = "";
      const file = values.resumeFile as File | undefined;

      if (file) {
         if (file.type !== 'application/pdf') {
            toast({
              variant: "destructive",
              title: "Invalid File Type",
              description: "Please upload a PDF (.pdf) file.",
            });
            setIsLoading(false);
            return;
         }
        const [pdfDataUri, extractedText] = await Promise.all([
            fileToDataUri(file),
            extractTextFromPdf(file)
        ]);
        resumeTextForAnalysis = extractedText;
        result = await analyzeResumeAtsPdf({ pdfDataUri });
      } else {
        resumeTextForAnalysis = values.resumeText;
        result = await analyzeResumeAts({
          resumeText: values.resumeText,
        });
      }
      setAnalysisResult(result);
      setCurrentResumeText(resumeTextForAnalysis);
    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const getFullReportText = (result: AnalyzeResumeAtsOutput) => {
    return `
      ATS Resume Analysis Report
      Overall Score: ${result.atsReadinessScore}/100
      Keyword Optimization: ${result.keywordOptimization.score}/100 - ${result.keywordOptimization.feedback}
      Clarity & Conciseness: ${result.clarityAndConciseness.score}/100 - ${result.clarityAndConciseness.feedback}
      Formatting & Structure: ${result.formattingAndStructure.score}/100 - ${result.formattingAndStructure.feedback}
      Action Verbs: ${result.actionVerbs.score}/100 - ${result.actionVerbs.feedback}
      Suggestions for Improvement: ${result.suggestions}
    `;
  };

  const handleFixMyResume = () => {
    if (!analysisResult || !currentResumeText) return;

    try {
        const reportText = getFullReportText(analysisResult);
        sessionStorage.setItem('fixMyResumeData', JSON.stringify({
            resumeText: currentResumeText,
            atsReportText: reportText,
        }));
        router.push('/dashboard/fix-my-resume');
    } catch (error) {
        console.error("Error saving to sessionStorage:", error);
        toast({
            variant: "destructive",
            title: "Navigation Failed",
            description: "Could not prepare data for the resume fixer. Please try again."
        });
    }
  };

  const downloadReport = () => {
    if (!analysisResult) return;
    const report = getFullReportText(analysisResult);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ats_report.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const analysisSections = analysisResult ? [
      { title: "Keyword Optimization", data: analysisResult.keywordOptimization },
      { title: "Clarity & Conciseness", data: analysisResult.clarityAndConciseness },
      { title: "Formatting & Structure", data: analysisResult.formattingAndStructure },
      { title: "Action Verbs", data: analysisResult.actionVerbs },
  ] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">ATS Resume Analyzer</CardTitle>
          <CardDescription>Get real-time feedback on your resume's ATS compatibility.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="resumeText"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Paste Your Resume</FormLabel>
                       <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload PDF
                        </Button>
                        <Input
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf"
                        />
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full text of your resume here, or upload a .pdf file..."
                        className="min-h-[300px]"
                        {...field}
                        value={fileName ? `File uploaded: ${fileName}`: field.value}
                        readOnly={!!fileName}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Resume
                  </>
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
            Your resume's analysis will appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-full">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-center h-full p-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">The AI is analyzing your resume...</p>
            </div>
          )}

          {!isLoading && !analysisResult && (
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[400px]">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-bold text-xl">Ready for Analysis</h3>
              <p className="text-muted-foreground">Paste your resume or upload a PDF to see the report.</p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div className="space-y-2 text-center p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-lg">Overall ATS Score</h4>
                <div className="relative w-32 h-32 mx-auto">
                    <Progress value={analysisResult.atsReadinessScore} className="absolute inset-0 w-full h-full rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-bold text-3xl text-primary">{analysisResult.atsReadinessScore}<span className="text-base">/100</span></span>
                    </div>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                {analysisSections.map((section, index) => (
                    <AccordionItem value={`item-${index}`} key={section.title}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-4 w-full">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-semibold">{section.title}</h4>
                                        <span className="font-semibold text-primary">{section.data.score}/100</span>
                                    </div>
                                    <Progress value={section.data.score} className="h-2" />
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.data.feedback}</p>
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
              
              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-lg flex items-center gap-2"><Lightbulb className="text-yellow-500" />Suggestions for Improvement</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-accent/20 p-4 rounded-md">{analysisResult.suggestions}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                 <Button onClick={handleFixMyResume} variant="secondary">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Fix My Resume with AI
                </Button>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

    