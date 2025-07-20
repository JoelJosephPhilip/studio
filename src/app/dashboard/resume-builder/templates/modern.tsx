
import React from 'react';
import Image from 'next/image';
import { Mail, Phone, Linkedin, Globe, MapPin } from 'lucide-react';

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

interface ModernTemplateProps {
  resume: ResumeData;
  photo: string | null;
}

const ModernTemplate: React.FC<ModernTemplateProps> = ({ resume, photo }) => {
  const { personalDetails, professionalSummary, workExperience, education, skills } = resume;

  return (
    <div className="p-8 font-sans bg-white text-gray-700">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-700">{personalDetails.fullName}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 text-gray-500">
            {personalDetails.address && <span className="flex items-center gap-1.5"><MapPin size={12} /> {personalDetails.address}</span>}
            <a href={`mailto:${personalDetails.email}`} className="flex items-center gap-1.5"><Mail size={12} /> {personalDetails.email}</a>
            <span className="flex items-center gap-1.5"><Phone size={12} /> {personalDetails.phoneNumber}</span>
            {personalDetails.linkedIn && <a href={personalDetails.linkedIn} className="flex items-center gap-1.5"><Linkedin size={12} /> LinkedIn</a>}
            {personalDetails.portfolio && <a href={personalDetails.portfolio} className="flex items-center gap-1.5"><Globe size={12} /> Portfolio</a>}
          </div>
        </div>
        {photo && (
            <Image src={photo} alt={personalDetails.fullName} width={96} height={96} className="rounded-full" />
        )}
      </header>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
            <section className="mb-6">
                <h2 className="text-sm font-bold uppercase text-blue-700 border-b-2 border-blue-200 pb-1 mb-3 tracking-wider">Summary</h2>
                <p className="text-sm">{professionalSummary}</p>
            </section>
            
            <section className="mb-6">
                <h2 className="text-sm font-bold uppercase text-blue-700 border-b-2 border-blue-200 pb-1 mb-3 tracking-wider">Work Experience</h2>
                {workExperience.map((exp, index) => (
                <div key={index} className="mb-4">
                    <div className="flex justify-between items-baseline">
                        <h3 className="text-lg font-semibold text-gray-800">{exp.jobTitle}</h3>
                        <span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate || 'Present'}</span>
                    </div>
                    <p className="text-sm font-medium">{exp.company} {exp.location && `— ${exp.location}`}</p>
                    <ul className="list-disc list-inside ml-4 text-sm mt-1 text-gray-600">
                        {exp.responsibilities.split('\n').map((item, i) => item && <li key={i}>{item}</li>)}
                    </ul>
                </div>
                ))}
            </section>
        </div>

        <div className="col-span-1">
            <section className="mb-6">
                <h2 className="text-sm font-bold uppercase text-blue-700 border-b-2 border-blue-200 pb-1 mb-3 tracking-wider">Skills</h2>
                <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{skill}</span>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-sm font-bold uppercase text-blue-700 border-b-2 border-blue-200 pb-1 mb-3 tracking-wider">Education</h2>
                {education.map((edu, index) => (
                <div key={index} className="mb-3">
                    <h3 className="font-semibold text-gray-800">{edu.degree}</h3>
                    <p className="text-sm">{edu.institution}</p>
                    <p className="text-xs text-gray-500">{edu.fieldOfStudy}</p>
                    <p className="text-xs text-gray-500">{edu.startDate} - {edu.endDate || 'Present'}</p>
                </div>
                ))}
            </section>
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate;
