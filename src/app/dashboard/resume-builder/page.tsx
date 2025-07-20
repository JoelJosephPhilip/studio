
"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";

import { Loader2, Sparkles, Upload, Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";

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
  personalDetails: z.object({
    fullName: z.string().min(2, "Full name is required."),
    email: z.string().email("Invalid email address."),
    phoneNumber: z.string().min(10, "Phone number is required."),
    address: z.string().optional(),
    linkedIn: z.string().url("Invalid URL.").optional(),
    portfolio: z.string().url("Invalid URL.").optional(),
  }),
  professionalSummary: z.string().min(20, "Please provide a brief professional summary."),
  workExperience: z.array(z.object({
    jobTitle: z.string().min(2, "Job title is required."),
    company: z.string().min(2, "Company name is required."),
    location: z.string().optional(),
    startDate: z.string().min(4, "Start date is required."),
    endDate: z.string().optional(),
    responsibilities: z.string().min(20, "Please describe your responsibilities."),
  })),
  education: z.array(z.object({
    institution: z.string().min(2, "Institution name is required."),
    degree: z.string().min(2, "Degree is required."),
    fieldOfStudy: z.string().min(2, "Field of study is required."),
    startDate: z.string().min(4, "Start date is required."),
    endDate: z.string().optional(),
  })),
  skills: z.string().min(5, "Please list some skills."),
  jobDescription: z.string().optional(),
  photo: z.any().optional(),
});

const steps = [
  { id: 1, name: "Personal Details" },
  { id: 2, name: "Work Experience" },
  { id: 3, name: "Education" },
  { id: 4, name: "Skills" },
  { id: 5, name: "Final Touches" },
];

export default function ResumeBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [generationResult, setGenerationResult] = useState<AiResumeBuilderOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personalDetails: { fullName: "", email: "", phoneNumber: "", address: "", linkedIn: "", portfolio: "" },
      professionalSummary: "",
      workExperience: [{ jobTitle: "", company: "", location: "", startDate: "", endDate: "", responsibilities: "" }],
      education: [{ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "" }],
      skills: "",
      jobDescription: "",
    },
  });

  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({
    control: form.control,
    name: "workExperience",
  });
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control: form.control,
    name: "education",
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

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGenerationResult(null);

    let photoDataUri: string | undefined = undefined;
    if (photoPreview) {
        photoDataUri = photoPreview;
    }

    const userDetailsString = `
      Personal Details:
      - Name: ${values.personalDetails.fullName}
      - Email: ${values.personalDetails.email}
      - Phone: ${values.personalDetails.phoneNumber}
      - Address: ${values.personalDetails.address || 'N/A'}
      - LinkedIn: ${values.personalDetails.linkedIn || 'N/A'}
      - Portfolio: ${values.personalDetails.portfolio || 'N/A'}

      Professional Summary:
      ${values.professionalSummary}

      Work Experience:
      ${values.workExperience.map(exp => `
        - Job Title: ${exp.jobTitle}
        - Company: ${exp.company}
        - Location: ${exp.location || 'N/A'}
        - Dates: ${exp.startDate} - ${exp.endDate || 'Present'}
        - Responsibilities: ${exp.responsibilities}
      `).join('\n')}

      Education:
      ${values.education.map(edu => `
        - Institution: ${edu.institution}
        - Degree: ${edu.degree}
        - Field of Study: ${edu.fieldOfStudy}
        - Dates: ${edu.startDate} - ${edu.endDate || 'Present'}
      `).join('\n')}

      Skills:
      ${values.skills}
    `;

    try {
      const result = await aiResumeBuilder({
        userDetails: userDetailsString,
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div key="step1" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="space-y-4">
            <h3 className="font-headline text-xl">Personal Details</h3>
            <FormField control={form.control} name="personalDetails.fullName" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="personalDetails.email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="personalDetails.phoneNumber" render={({ field }) => (
              <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="personalDetails.address" render={({ field }) => (
              <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Input placeholder="123 Main St, Anytown, USA" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="personalDetails.linkedIn" render={({ field }) => (
              <FormItem><FormLabel>LinkedIn Profile (Optional)</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/johndoe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="personalDetails.portfolio" render={({ field }) => (
              <FormItem><FormLabel>Portfolio/Website (Optional)</FormLabel><FormControl><Input placeholder="https://johndoe.dev" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="professionalSummary" render={({ field }) => (
              <FormItem><FormLabel>Professional Summary</FormLabel><FormControl><Textarea placeholder="A brief summary of your career achievements and goals..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="space-y-6">
            <h3 className="font-headline text-xl">Work Experience</h3>
            {workFields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border rounded-md relative">
                 <FormField control={form.control} name={`workExperience.${index}.jobTitle`} render={({ field }) => (
                    <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name={`workExperience.${index}.company`} render={({ field }) => (
                    <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Tech Corp" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name={`workExperience.${index}.location`} render={({ field }) => (
                    <FormItem><FormLabel>Location (Optional)</FormLabel><FormControl><Input placeholder="San Francisco, CA" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name={`workExperience.${index}.startDate`} render={({ field }) => (
                        <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input placeholder="YYYY-MM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`workExperience.${index}.endDate`} render={({ field }) => (
                        <FormItem><FormLabel>End Date (or blank)</FormLabel><FormControl><Input placeholder="YYYY-MM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
                 <FormField control={form.control} name={`workExperience.${index}.responsibilities`} render={({ field }) => (
                    <FormItem><FormLabel>Responsibilities & Achievements</FormLabel><FormControl><Textarea placeholder="Describe your key responsibilities and accomplishments..." className="min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                {workFields.length > 1 && (
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => removeWork(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => appendWork({ jobTitle: "", company: "", location: "", startDate: "", endDate: "", responsibilities: "" })}>
              <Plus className="mr-2 h-4 w-4" /> Add Experience
            </Button>
          </motion.div>
        );
      case 3:
        return (
           <motion.div key="step3" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="space-y-6">
            <h3 className="font-headline text-xl">Education</h3>
            {eduFields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border rounded-md relative">
                 <FormField control={form.control} name={`education.${index}.institution`} render={({ field }) => (
                    <FormItem><FormLabel>Institution</FormLabel><FormControl><Input placeholder="University of Example" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name={`education.${index}.degree`} render={({ field }) => (
                    <FormItem><FormLabel>Degree</FormLabel><FormControl><Input placeholder="Bachelor of Science" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name={`education.${index}.fieldOfStudy`} render={({ field }) => (
                    <FormItem><FormLabel>Field of Study</FormLabel><FormControl><Input placeholder="Computer Science" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name={`education.${index}.startDate`} render={({ field }) => (
                        <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input placeholder="YYYY-MM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`education.${index}.endDate`} render={({ field }) => (
                        <FormItem><FormLabel>End Date (or blank)</FormLabel><FormControl><Input placeholder="YYYY-MM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
                {eduFields.length > 1 && (
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => removeEdu(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => appendEdu({ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "" })}>
              <Plus className="mr-2 h-4 w-4" /> Add Education
            </Button>
          </motion.div>
        );
       case 4:
        return (
          <motion.div key="step4" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="space-y-4">
            <h3 className="font-headline text-xl">Skills</h3>
             <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., JavaScript, React, Node.js, Project Management, Public Speaking"
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a comma-separated list of your skills.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </motion.div>
        );
      case 5:
        return (
          <motion.div key="step5" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} className="space-y-4">
             <h3 className="font-headline text-xl">Final Touches</h3>
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the job description here to tailor your resume for a specific role."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Providing a job description helps the AI optimize your resume for ATS.
                    </FormDescription>
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
                      <div>
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
                      </div>
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
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-headline">AI Resume Builder</CardTitle>
          <CardDescription>
            {isLoading || generationResult ? 'View your generated resume.' : 'Fill in your details, and let our AI create a professional resume for you.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Progress value={(currentStep / steps.length) * 100} className="w-full" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              {steps.map(step => (
                <div key={step.id} className={`text-center ${currentStep >= step.id ? 'font-semibold text-primary' : ''}`}>
                  Step {step.id}
                  <div className="hidden sm:block">{step.name}</div>
                </div>
              ))}
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>
              
              <div className="flex justify-between items-center pt-4">
                <div>
                  {currentStep > 1 && (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  )}
                </div>

                <div>
                  {currentStep < steps.length && (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  {currentStep === steps.length && (
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
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-1 sticky top-6">
        <CardHeader>
            <CardTitle className="font-headline">Generated Resume</CardTitle>
            <CardDescription>
                Your AI-generated resume will appear here.
            </CardDescription>
        </CardHeader>
        <CardContent className="h-full">
            {isLoading && (
                <div className="flex flex-col items-center justify-center text-center h-full p-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">The AI is forging your resume... Please wait.</p>
                </div>
            )}

            {!isLoading && !generationResult && (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg min-h-[500px]">
                    <h3 className="font-bold text-xl">Your resume is waiting</h3>
                    <p className="text-muted-foreground">Complete the steps to see the magic happen.</p>
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
