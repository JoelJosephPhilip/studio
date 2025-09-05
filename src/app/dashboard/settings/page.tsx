
'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, DocumentData } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, FileText, Download, Trash2, MoreHorizontal, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsSidebar } from './_components/settings-sidebar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteResume, getResumes } from '@/app/actions/resume-actions';

export type Resume = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

function ResumeManager() {
  const [user, loadingUser] = useAuthState(auth);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const fetchAndSetResumes = async () => {
        setIsLoading(true);
        const fetchedResumes = await getResumes({ userId: user.uid });
        setResumes(fetchedResumes);
        setIsLoading(false);
      };
      fetchAndSetResumes();
    } else if (!loadingUser) {
      setIsLoading(false);
    }
  }, [user, loadingUser]);

  const downloadResumeAsPdf = (resume: Resume) => {
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(resume.content, 180);
    pdf.text(lines, 15, 15);
    pdf.save(`${resume.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDeleteClick = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedResumeId || !user) return;
    setIsDeleting(true);
    try {
      await deleteResume({ userId: user.uid, resumeId: selectedResumeId });
      setResumes(resumes.filter(r => r.id !== selectedResumeId));
      toast({
        title: "Resume Deleted",
        description: "The resume has been successfully removed.",
      });
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the resume. Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
      setSelectedResumeId(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (resumes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-bold text-xl">No Resumes Found</h3>
          <p className="text-muted-foreground">You haven't saved any resumes yet.</p>
        </div>
      );
    }
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
                  Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => downloadResumeAsPdf(resume)}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteClick(resume.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Resume Manager</CardTitle>
        <CardDescription>View, download, or delete your saved resumes.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your resume from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}


export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('resumes');

    return (
      <div className="grid md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr] gap-6">
        <SettingsSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <div className="w-full">
            {activeSection === 'resumes' && <ResumeManager />}
            {/* Other sections will be rendered here based on activeSection state */}
        </div>
      </div>
    );
}
