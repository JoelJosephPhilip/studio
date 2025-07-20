import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InterviewCoachPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Interview Coach</CardTitle>
          <CardDescription>Get personalized interview questions based on your resume and job title.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will help you prepare for your next interview with AI-generated questions.</p>
          </div>
        </CardContent>
      </Card>
    )
}
