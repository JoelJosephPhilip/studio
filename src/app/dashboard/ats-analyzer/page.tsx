import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AtsAnalyzerPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">ATS Resume Analyzer</CardTitle>
          <CardDescription>Get real-time feedback on your resume's ATS compatibility.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will help you optimize your resume for applicant tracking systems.</p>
          </div>
        </CardContent>
      </Card>
    )
}
