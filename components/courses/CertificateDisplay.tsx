"use client";

import { Award, Printer } from "lucide-react";
import type { Certificate } from "@/types/course";
import { Button } from "@/components/ui";
import { getLmsUrl } from "@/lib/urls";

export default function CertificateDisplay({
  certificate,
}: {
  certificate: Certificate & {
    courseId?: { title?: string; slug?: string };
  };
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mb-8">
      <div
        className="certificate-panel rounded-2xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm md:p-12"
        id="course-certificate"
      >
        <div className="mb-4 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Award className="h-8 w-8 text-amber-500" />
          </span>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Certificate of Completion
        </p>
        <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
          {certificate.courseId?.title || "Course"}
        </h2>
        <p className="mb-1 text-slate-500">
          This certifies successful completion of
        </p>
        <p className="mb-8 font-medium text-slate-700">
          the Handiz online course program
        </p>
        <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-500 md:flex-row md:gap-6">
          <span>Certificate #{certificate.certificateNumber}</span>
          <span className="hidden md:inline">·</span>
          <span>
            Issued {new Date(certificate.issuedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="certificate-actions print-hide mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print Certificate
        </Button>
        {certificate.courseId?.slug && (
          <a href={getLmsUrl(`/courses/${certificate.courseId.slug}`)}>
            <Button variant="ghost" size="sm">
              View Course
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
