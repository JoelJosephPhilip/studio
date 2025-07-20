import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResumeBuilderPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">AI Resume Builder</CardTitle>
          <CardDescription>Create a stunning resume with the power of AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will help you build a professional resume with smart suggestions and beautiful templates.</p>
          </div>
        </CardContent>
      </Card>
    )
}
