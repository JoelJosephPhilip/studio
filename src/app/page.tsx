import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  FileText,
  Languages,
  Lightbulb,
  Mail,
  MessageSquare,
  PenTool,
  Search,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/logo';
import Image from 'next/image';

const features = [
  {
    icon: <Wand2 className="h-8 w-8 text-primary" />,
    title: 'AI Resume Builder',
    description:
      'Gemini-powered resume generation with smart bullet points, summaries, and ATS-optimized templates.',
  },
  {
    icon: <Mail className="h-8 w-8 text-primary" />,
    title: 'Cover Letter Builder',
    description:
      'Auto-generate compelling cover letters from your resume or a job description in seconds.',
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    title: 'ATS Resume Analyzer',
    description:
      'Get real-time feedback on grammar, keywords, and formatting to beat the bots.',
  },
  {
    icon: <Search className="h-8 w-8 text-primary" />,
    title: 'JD–Resume Similarity',
    description:
      'Compare your resume to job descriptions and get a match score with suggestions.',
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-primary" />,
    title: 'AI Interview Coach',
    description:
      'Practice with personalized interview questions based on your resume and target job.',
  },
  {
    icon: <Lightbulb className="h-8 w-8 text-primary" />,
    title: 'Skill Gap Analysis',
    description:
      'Identify missing skills and get recommendations for career path development.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex">
            <Logo isLink className="mr-6" />
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-card">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Build Your Future with CareerForge AI
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Your all-in-one platform to create winning resumes, ace
                    interviews, and land your dream job. Powered by Gemini.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/signup">
                      Create Your Resume
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                width="600"
                height="400"
                alt="Hero"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="woman resume"
              />
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything You Need to Succeed
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From resume building to interview prep, our comprehensive
                  suite of tools is designed to give you a competitive edge.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 sm:grid-cols-2 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="h-full">
                  <CardHeader>
                    {feature.icon}
                    <CardTitle className="font-headline text-xl">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Forge Your Career Path?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join thousands of successful professionals who have transformed
                their job search with CareerForge AI.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} CareerForge AI. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
