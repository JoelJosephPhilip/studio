import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function JdMatcherPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">JD–Resume Similarity Matching</CardTitle>
          <CardDescription>Compare your resume to a job description and get a match score.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will analyze your resume against a job description and provide suggestions for improvement.</p>
          </div>
        </CardContent>
      </Card>
    )
}
