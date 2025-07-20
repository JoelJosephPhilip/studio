import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TranslatePage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Multilingual Resume Generator</CardTitle>
          <CardDescription>Translate your resume into multiple languages with culturally correct formatting.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will help you create resumes for international job applications.</p>
          </div>
        </CardContent>
      </Card>
    )
}
