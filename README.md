# CareerForge AI

CareerForge AI is a comprehensive, AI-powered platform designed to help users navigate the job market successfully. From building the perfect resume to acing the interview, CareerForge AI provides a suite of tools to give job seekers a competitive edge. The application is built with Next.js and leverages the power of Google's Gemini for its intelligent features.

## Features

-   **AI Resume Builder**: Generate professional, ATS-optimized resumes from scratch or by providing your details. Choose from multiple templates (Modern, Classic, Creative).
-   **Cover Letter Builder**: Automatically create compelling cover letters tailored to specific job descriptions.
-   **ATS Resume Analyzer**: Get real-time feedback on your resume's compatibility with Applicant Tracking Systems, including scores on keyword optimization, clarity, and more.
-   **Fix My Resume**: Let the AI rewrite your resume based on the feedback from the ATS analyzer to instantly improve it.
-   **JD–Resume Similarity Matching**: See how well your resume matches a job description with a detailed similarity score and keyword analysis.
-   **AI Interview Coach**: Prepare for interviews with personalized behavioral and technical questions, sample answers, and feedback based on your resume and the target job.
-   **Job Search Aggregator**: Find job openings and instantly see a match score for your resume against each listing.
-   **Skill Gap & Career Path**: Analyze your skills against a target job and receive a detailed career path roadmap with learning resources.
-   **Multilingual Resume Translator**: Translate your resume into various languages with cultural and professional localization.
-   **Secure Resume & Job Storage**: Save and manage your resumes and interesting job postings in your personal dashboard, powered by Supabase.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **Language**: TypeScript
-   **AI**: [Google's Gemini](https://ai.google/gemini/) via [Genkit](https://firebase.google.com/docs/genkit)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN/UI](https://ui.shadcn.com/)
-   **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google Provider) & Firebase Authentication (Email/Password)
-   **Database & Storage**: [Supabase](https://supabase.com/)

## Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

-   Node.js (v18 or later)
-   npm, yarn, or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root of your project by copying the example file:
    ```bash
    cp .env.example .env
    ```

    Now, open the `.env` file and fill in the required values. You will need to get these credentials from the respective services (Firebase, Google Cloud, Supabase, SerpApi).

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Running Genkit Flows

To test and run Genkit flows locally, you can use the Genkit development UI:

```bash
npm run genkit:watch
```
This will start the Genkit development server, typically on port 4000.
