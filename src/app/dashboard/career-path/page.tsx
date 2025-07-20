import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CareerPathPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Skill Gap & Career Path</CardTitle>
          <CardDescription>Analyze skill gaps and get career path recommendations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will help you identify skills to learn and suggest future career directions.</p>
          </div>
        </CardContent>
      </Card>
    )
}
