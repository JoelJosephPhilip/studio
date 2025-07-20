
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, Download, Upload } from "lucide-react";
import * as pdfjs from "pdfjs-dist";

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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { analyzeResumeAts, AnalyzeResumeAtsOutput } from "@/ai/flows/ats-resume-analyzer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Set worker source for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const formSchema = z.object({
  resumeText: z.string().min(100, "Please paste your full resume text or upload a file."),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function AtsAnalyzerPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResumeAtsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resumeText: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        form.setValue("resumeText", text);
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result as ArrayBuffer;
        try {
          const loadingTask = pdfjs.getDocument({ data });
          const pdf = await loadingTask.promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(" ");
            fullText += pageText + "\n";
          }
          form.setValue("resumeText", fullText);
        } catch (error) {
          console.error("Error parsing PDF:", error);
          toast({
            variant: "destructive",
            title: "PDF Parsing Error",
            description: "Could not extract text from the PDF file.",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please upload a plain text (.txt) or PDF (.pdf) file.",
      });
    }
  };


  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeResumeAts({
        resumeText: values.resumeText,
      });
      setAnalysisResult(result);
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

  const downloadReport = () => {
    if (!analysisResult) return;
    const report = `
ATS Resume Analysis Report
==========================

Overall Score: ${analysisResult.atsReadinessScore}/100

Feedback:
---------
${analysisResult.feedback}

Suggestions:
------------
${analysisResult.suggestions}
    `;
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
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Resume
                        </Button>
                        <Input
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".txt,.pdf"
                        />
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full text of your resume here, or upload a .txt or .pdf file..."
                        className="min-h-[300px]"
                        {...field}
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
              <h3 className="font-bold text-xl">Ready for Analysis</h3>
              <p className="text-muted-foreground">Paste your resume and click analyze to see the report.</p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Overall ATS Score</h4>
                  <span className="font-bold text-lg text-primary">{analysisResult.atsReadinessScore}/100</span>
                </div>
                <Progress value={analysisResult.atsReadinessScore} className="w-full" />
              </div>

              <Separator />

              <div className="space-y-4 max-h-[600px] overflow-auto pr-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Feedback</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisResult.feedback}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Suggestions for Improvement</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisResult.suggestions}</p>
                </div>
              </div>

              <Button onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
