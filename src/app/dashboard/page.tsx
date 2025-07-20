import Link from 'next/link';
import { ArrowUpRight, FileText, Mail, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Dashboard
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Resume</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Start Fresh</div>
            <p className="text-xs text-muted-foreground">
              Create a new resume from scratch or with AI help.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/dashboard/resume-builder">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Resume
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Cover Letter
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">Get Covering</div>
            <p className="text-xs text-muted-foreground">
              Generate a cover letter for a specific job.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/dashboard/cover-letter">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Cover Letter
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Resumes</CardTitle>
              <CardDescription>
                Your recently created or updated resumes.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/resume-builder">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Status
                  </TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Software Engineer Resume</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      For Google application
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="outline">
                      Draft
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">2024-07-29</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Product Manager Resume</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      For Meta application
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant="secondary">
                      Analyzed
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">2024-07-25</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
