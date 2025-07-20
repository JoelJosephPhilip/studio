import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CoverLetterPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Cover Letter Builder</CardTitle>
          <CardDescription>Auto-generate cover letters from your resume or a job description.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will help you create compelling cover letters in minutes.</p>
          </div>
        </CardContent>
      </Card>
    )
}
