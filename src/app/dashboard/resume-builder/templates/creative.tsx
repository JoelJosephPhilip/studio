
import React from 'react';
import Image from 'next/image';
import { Mail, Phone, Linkedin, Globe, MapPin, Briefcase, GraduationCap, Star } from 'lucide-react';

type ResumeData = {
    personalDetails: {
        fullName: string;
        email: string;
        phoneNumber: string;
        address?: string;
        linkedIn?: string;
        portfolio?: string;
    };
    professionalSummary: string;
    workExperience: {
        jobTitle: string;
        company: string;
        location?: string;
        startDate: string;
        endDate?: string;
        responsibilities: string;
    }[];
    education: {
        institution: string;
        degree: string;
        fieldOfStudy: string;
        startDate: string;
        endDate?: string;
    }[];
    skills: string[];
};

interface CreativeTemplateProps {
  resume: ResumeData;
  photo: string | null;
}

const CreativeTemplate: React.FC<CreativeTemplateProps> = ({ resume, photo }) => {
  const { personalDetails, professionalSummary, workExperience, education, skills } = resume;

  return (
    <div className="flex min-h-[29.7cm] bg-white">
      {/* Left Sidebar */}
      <aside className="w-1/3 bg-slate-800 text-white p-6">
        {photo && (
          <div className="flex justify-center mb-6">
            <Image src={photo} alt={personalDetails.fullName} width={128} height={128} className="rounded-full border-4 border-slate-500" />
          </div>
        )}
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-400">{personalDetails.fullName.split(' ')[0]}</h1>
            <h1 className="text-3xl font-bold">{personalDetails.fullName.split(' ').slice(1).join(' ')}</h1>
        </div>

        <div className="space-y-4 text-xs">
          <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-2">Contact</h2>
          {personalDetails.email && <div className="flex items-center gap-2"><Mail size={14} className="text-teal-400" /> <a href={`mailto:${personalDetails.email}`}>{personalDetails.email}</a></div>}
          {personalDetails.phoneNumber && <div className="flex items-center gap-2"><Phone size={14} className="text-teal-400" /> {personalDetails.phoneNumber}</div>}
          {personalDetails.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-teal-400" /> {personalDetails.address}</div>}
          {personalDetails.linkedIn && <div className="flex items-center gap-2"><Linkedin size={14} className="text-teal-400" /> <a href={personalDetails.linkedIn}>LinkedIn</a></div>}
          {personalDetails.portfolio && <div className="flex items-center gap-2"><Globe size={14} className="text-teal-400" /> <a href={personalDetails.portfolio}>Portfolio</a></div>}
        </div>

        <div className="mt-8 space-y-4 text-xs">
          <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-2">Skills</h2>
          <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                  <span key={index} className="bg-slate-700 text-teal-300 px-2 py-1 rounded-md">{skill}</span>
              ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-2/3 p-8">
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-teal-400 pb-2 mb-4 flex items-center gap-2">
            <Star className="text-teal-400" /> Professional Summary
          </h2>
          <p className="text-sm text-gray-700">{professionalSummary}</p>
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-teal-400 pb-2 mb-4 flex items-center gap-2">
            <Briefcase className="text-teal-400" /> Work Experience
          </h2>
          {workExperience.map((exp, index) => (
            <div key={index} className="mb-4 relative pl-5">
              <div className="absolute left-0 top-1.5 h-full w-[2px] bg-gray-200"></div>
              <div className="absolute left-[-4px] top-1.5 h-3 w-3 rounded-full bg-teal-400"></div>
              <p className="text-xs text-gray-500">{exp.startDate} - {exp.endDate || 'Present'}</p>
              <h3 className="text-lg font-semibold text-slate-700">{exp.jobTitle}</h3>
              <p className="text-sm font-medium text-gray-600">{exp.company} {exp.location && `| ${exp.location}`}</p>
              <ul className="list-disc list-inside ml-4 text-xs mt-1 text-gray-600">
                {exp.responsibilities.split('\n').map((item, i) => item && <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-teal-400 pb-2 mb-4 flex items-center gap-2">
            <GraduationCap className="text-teal-400" /> Education
          </h2>
          {education.map((edu, index) => (
            <div key={index} className="mb-3 pl-5 relative">
              <div className="absolute left-0 top-1.5 h-full w-[2px] bg-gray-200"></div>
              <div className="absolute left-[-4px] top-1.5 h-3 w-3 rounded-full bg-teal-400"></div>
              <p className="text-xs text-gray-500">{edu.startDate} - {edu.endDate || 'Present'}</p>
              <h3 className="text-lg font-semibold text-slate-700">{edu.degree}</h3>
              <p className="text-sm font-medium text-gray-600">{edu.institution}</p>
              <p className="text-xs text-gray-500">{edu.fieldOfStudy}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default CreativeTemplate;
