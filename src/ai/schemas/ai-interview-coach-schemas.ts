/**
 * @fileOverview This file defines the Zod schemas and TypeScript types for the AI Interview Coach feature.
 * By separating schemas from the flow, we avoid "use server" module constraint violations in Next.js.
 */

import { z } from 'zod';

// --- Schemas for the main Interview Prep Pack ---

export const AiInterviewCoachInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  jobTitle: z.string().describe('The job title the user is interviewing for.'),
  jobDescription: z.string().optional().describe('The job description for the role.'),
});
export type AiInterviewCoachInput = z.infer<typeof AiInterviewCoachInputSchema>;

export const QuestionAnswerPairSchema = z.object({
    question: z.string().describe("The interview question."),
    sampleAnswer: z.string().describe("A strong, sample answer to the question."),
});

export const McqQuestionSchema = z.object({
    question: z.string().describe("The multiple-choice question."),
    options: z.array(z.string()).describe("An array of 4 possible answers."),
    correctAnswer: z.string().describe("The correct answer from the options."),
});

const FeedbackSchema = z.object({
    strengths: z.array(z.string()).describe("A list of key strengths based on the resume for this role."),
    areasForImprovement: z.array(z.string()).describe("A list of potential weak spots or areas to prepare for."),
});

export const AiInterviewCoachOutputSchema = z.object({
  behavioral: z.array(QuestionAnswerPairSchema).describe('An array of behavioral interview questions and answers.'),
  technical: z.array(QuestionAnswerPairSchema).describe('An array of technical/situational interview questions and answers.'),
  mcqs: z.array(McqQuestionSchema).describe('An array of multiple-choice questions.'),
  feedback: FeedbackSchema.describe("A summary of strengths and areas for improvement."),
});
export type AiInterviewCoachOutput = z.infer<typeof AiInterviewCoachOutputSchema>;


// --- Schemas for the "Generate More Questions" feature ---

export const GenerateMoreQuestionsInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  jobTitle: z.string().describe('The job title the user is interviewing for.'),
  jobDescription: z.string().optional().describe('The job description for the role.'),
  category: z.enum(['behavioral', 'technical', 'mcq']).describe('The category of questions to generate.'),
  existingQuestions: z.array(z.string()).describe('A list of questions already generated to avoid duplicates.'),
});
export type GenerateMoreQuestionsInput = z.infer<typeof GenerateMoreQuestionsInputSchema>;

export const GenerateMoreQuestionsOutputSchema = z.object({
    behavioral: z.array(QuestionAnswerPairSchema).optional(),
    technical: z.array(QuestionAnswerPairSchema).optional(),
    mcqs: z.array(McqQuestionSchema).optional(),
});
export type GenerateMoreQuestionsOutput = z.infer<typeof GenerateMoreQuestionsOutputSchema>;
