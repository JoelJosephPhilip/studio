
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, Upload } from "lucide-react";

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  aiResumeBuilder,
  AiResumeBuilderOutput,
} from "@/ai/flows/ai-resume-builder";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

const formSchema = z.object({
  userDetails: z.string().min(50, {
    message: "User details must be at least 50 characters.",
  }),
  jobDescription: z.string().optional(),
  photo: z.any().optional(),
});

export default function ResumeBuilderPage() {
  const [generationResult, setGenerationResult] = useState<AiResumeBuilderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userDetails: "",
      jobDescription: "",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGenerationResult(null);

    let photoDataUri: string | undefined = undefined;
    if (values.photo && values.photo.length > 0) {
      const file = values.photo[0];
      photoDataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    }

    try {
      const result = await aiResumeBuilder({
        userDetails: values.userDetails,
        jobDescription: values.jobDescription,
        photoDataUri,
      });
      setGenerationResult(result);
    } catch (error) {
      console.error("Error generating resume:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-headline">AI Resume Builder</CardTitle>
          <CardDescription>
            Fill in your details, and let our AI create a professional resume for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="userDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself. Include your name, contact info, work experience, education, skills, and any other relevant information."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is the most important part. Be as detailed as possible.
                    </FormDescription>
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
                        placeholder="Paste the job description here to tailor your resume for a specific role."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo (Optional)</FormLabel>
                    <FormControl>
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photo
                        </Button>
                        <Input
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => {
                            field.onChange(e.target.files);
                            handlePhotoChange(e);
                          }}
                          accept="image/*"
                        />
                      </>
                    </FormControl>
                    {photoPreview && (
                        <div className="mt-4">
                            <Image src={photoPreview} alt="Photo preview" width={100} height={100} className="rounded-md object-cover" />
                        </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Resume
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-1">
        <CardHeader>
            <CardTitle className="font-headline">Generated Resume</CardTitle>
            <CardDescription>
                Your AI-generated resume will appear here.
            </CardDescription>
        </CardHeader>
        <CardContent className="h-full">
            {isLoading && (
                <div className="flex flex-col items-center justify-center text-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">The AI is forging your resume... Please wait.</p>
                </div>
            )}

            {!isLoading && !generationResult && (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg h-full">
                    <h3 className="font-bold text-xl">Your resume is waiting</h3>
                    <p className="text-muted-foreground">Fill out the form and click "Generate Resume" to see the magic happen.</p>
                </div>
            )}

            {generationResult && (
                 <div className="space-y-4">
                    {generationResult.atsScore && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">ATS Score</h4>
                            <span className="font-bold text-lg text-primary">{generationResult.atsScore}%</span>
                        </div>
                        <Progress value={generationResult.atsScore} className="w-full" />
                        <p className="text-xs text-muted-foreground">This score estimates how well your resume will pass through Applicant Tracking Systems.</p>
                    </div>
                    )}
                    <Separator />
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted rounded-md p-4 h-[600px] overflow-auto">
                        <pre className="font-sans text-sm">{generationResult.resume}</pre>
                    </div>
                    <Button>Download Resume</Button>
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
