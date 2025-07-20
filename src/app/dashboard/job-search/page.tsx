import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function JobSearchPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Job Search Aggregator</CardTitle>
          <CardDescription>Find jobs from multiple platforms and get suggestions based on your resume.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <h3 className="font-bold text-xl">Feature Coming Soon</h3>
            <p className="text-muted-foreground">This tool will integrate with job platforms to streamline your search.</p>
          </div>
        </CardContent>
      </Card>
    )
}
