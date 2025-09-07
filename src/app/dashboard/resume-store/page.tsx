
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Upload, FileText, Download, Trash2, MoreHorizontal, AlertTriangle, Save } from "lucide-react";
import jsPDF from 'jspdf';
import { useSession } from 'next-auth/react';
import { useAuthState } from 'react-firebase-hooks/auth';

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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { getResumes, deleteResume, savePastedResume, uploadAndSaveResume, type Resume } from "@/app/actions/resume-actions";
import { auth } from "@/lib/firebase";

const formSchema = z.object({
  title: z.string().min(2, 'A title is required for your resume.'),
  resumeText: z.string().optional(),
  resumeFile: z.any().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

function ResumeList({ resumes, onAction }: { resumes: Resume[], onAction: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  const downloadResumeAsPdf = (resume: Resume) => {
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(resume.content, 180);
    pdf.text(lines, 15, 15);
    pdf.save(`${resume.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDeleteClick = (resume: Resume) => {
    setSelectedResume(resume);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedResume) return;
    setIsDeleting(true);
    try {
      await deleteResume({ resumeId: selectedResume.id, storagePath: selectedResume.storage_path });
      toast({
        title: "Resume Deleted",
        description: "The resume has been successfully removed.",
      });
      onAction(); // Trigger refresh
    } catch (error: any) {
      console.error("Error deleting resume:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete the resume. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
      setSelectedResume(null);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {resumes.map(resume => (
          <motion.div
            key={resume.id}
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
          >
            <div>
              <p className="font-semibold">{resume.title}</p>
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(resume.updated_at).toLocaleDateString()}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadResumeAsPdf(resume)} disabled={resume.file_type === 'pdf'}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Download as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteClick(resume)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        ))}
      </AnimatePresence>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your resume.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}


export default function ResumeStorePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [user, firebaseLoading] = useAuthState(auth);
  const { data: session, status: sessionStatus } = useSession();
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", resumeText: "" },
  });

  const fetchResumes = async () => {
    setIsLoading(true);
    try {
      const fetchedResumes = await getResumes();
      setResumes(fetchedResumes);
    } catch (error: any) {
      console.error("Failed to fetch resumes:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not fetch your saved resumes." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const isUserLoading = firebaseLoading || sessionStatus === 'loading';
    const loggedIn = !!user || !!session;
    
    setIsUserLoggedIn(loggedIn);

    if (!isUserLoading) {
      if (loggedIn) {
        fetchResumes();
      } else {
        setIsLoading(false);
        setResumes([]);
      }
    }
  }, [user, session, firebaseLoading, sessionStatus]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("resumeFile", file);
      setFileName(file.name);
    }
  };

  async function onSubmit(values: FormSchemaType) {
    setIsSubmitting(true);
    
    try {
      if (values.resumeFile) {
        const file = values.resumeFile as File;
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({ variant: "destructive", title: "File too large", description: "Please upload a file smaller than 5MB." });
          setIsSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('file', file);
        await uploadAndSaveResume(formData);

      } else if (values.resumeText && values.resumeText.length > 50) {
        await savePastedResume({
          title: values.title,
          resumeText: values.resumeText,
        });
      } else {
        toast({ variant: "destructive", title: "No content", description: "Please upload a file or paste resume text." });
        setIsSubmitting(false);
        return;
      }
      
      toast({ title: "Resume Saved!", description: "Your resume has been successfully stored." });
      form.reset({ title: "", resumeText: "", resumeFile: undefined });
      setFileName(null);
      await fetchResumes(); // Refresh the list
    } catch (error: any) {
      console.error("Error saving resume:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderResumeList = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (!isUserLoggedIn) {
      return (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Please sign in</h3>
          <p className="mt-1 text-sm text-muted-foreground">You need to be logged in to manage your resumes.</p>
        </div>
      );
    }
    if (resumes.length === 0) {
      return (
        <div className="text-center p-12 border-2 border-dashed rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No resumes stored</h3>
          <p className="mt-1 text-sm text-muted-foreground">Get started by uploading or pasting a resume above.</p>
        </div>
      );
    }
    return <ResumeList resumes={resumes} onAction={fetchResumes} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Add a New Resume</CardTitle>
          <CardDescription>
            Upload a file or paste the text content of your resume to store it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resume Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Product Manager Resume" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="pt-4">
                    <FormField
                      control={form.control}
                      name="resumeFile"
                      render={() => (
                        <FormItem>
                          <FormLabel>Resume File (PDF or TXT)</FormLabel>
                          <FormControl>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                disabled={isSubmitting}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {fileName || "Select a file from your device"}
                            </Button>
                          </FormControl>
                          <Input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.txt"
                          />
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
                          <FormLabel>Paste Resume Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Paste the full text of your resume here..."
                              className="min-h-[200px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </TabsContent>
              </Tabs>
              <Button type="submit" disabled={isSubmitting || !isUserLoggedIn} className="w-full">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Resume</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Your Stored Resumes</CardTitle>
          <CardDescription>
            Manage all your saved resume versions from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderResumeList()}
        </CardContent>
      </Card>
    </div>
  );
}
