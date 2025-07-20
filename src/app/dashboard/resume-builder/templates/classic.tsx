
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

interface ClassicTemplateProps {
  resume: ResumeData;
  photo: string | null;
}

const ClassicTemplate: React.FC<ClassicTemplateProps> = ({ resume, photo }) => {
  const { personalDetails, professionalSummary, workExperience, education, skills } = resume;

  return (
    <div className="p-8 font-serif text-sm bg-white text-gray-800">
      <header className="text-center mb-8 border-b-2 border-gray-400 pb-4">
        <h1 className="text-4xl font-bold tracking-widest uppercase">{personalDetails.fullName}</h1>
        <div className="flex justify-center items-center gap-x-6 gap-y-1 text-xs mt-2 flex-wrap">
          {personalDetails.email && <a href={`mailto:${personalDetails.email}`} className="flex items-center gap-1"><Mail size={12} /> {personalDetails.email}</a>}
          {personalDetails.phoneNumber && <span className="flex items-center gap-1"><Phone size={12} /> {personalDetails.phoneNumber}</span>}
          {personalDetails.address && <span className="flex items-center gap-1"><MapPin size={12} /> {personalDetails.address}</span>}
          {personalDetails.linkedIn && <a href={personalDetails.linkedIn} className="flex items-center gap-1"><Linkedin size={12} /> LinkedIn</a>}
          {personalDetails.portfolio && <a href={personalDetails.portfolio} className="flex items-center gap-1"><Globe size={12} /> Portfolio</a>}
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wider">Summary</h2>
        <p className="text-justify">{professionalSummary}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wider">Experience</h2>
        {workExperience.map((exp, index) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-baseline">
                <h3 className="text-lg font-semibold">{exp.jobTitle}</h3>
                <span className="text-xs font-medium">{exp.startDate} - {exp.endDate || 'Present'}</span>
            </div>
            <div className="flex justify-between items-baseline mb-1">
                <p className="font-medium">{exp.company}</p>
                <p className="text-xs">{exp.location}</p>
            </div>
            <ul className="list-disc list-inside ml-4 text-sm">
              {exp.responsibilities.split('\n').map((item, i) => item && <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wider">Education</h2>
        {education.map((edu, index) => (
          <div key={index} className="mb-2">
            <div className="flex justify-between items-baseline">
                <h3 className="text-lg font-semibold">{edu.institution}</h3>
                <span className="text-xs font-medium">{edu.startDate} - {edu.endDate || 'Present'}</span>
            </div>
            <p className="font-medium">{edu.degree}, {edu.fieldOfStudy}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-bold border-b border-gray-300 pb-1 mb-2 uppercase tracking-wider">Skills</h2>
        <p className="text-sm">
          {skills.join(' · ')}
        </p>
      </section>
    </div>
  );
};

export default ClassicTemplate;
