"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { buildLessonDeviceSupportWhatsAppUrl } from "@/lib/courseContact";
import type { LessonDeviceErrorCode } from "@/lib/courses";
import { getLmsUrl } from "@/lib/urls";
import { Button, Card } from "@/components/ui";
import WhatsAppContactButton from "@/components/courses/WhatsAppContactButton";

type Props = {
  courseSlug: string;
  courseTitle: string;
  courseId: string;
  lessonSlug: string;
  errorcode: LessonDeviceErrorCode;
  message: string;
};

export default function LessonDeviceBlockedCard({
  courseSlug,
  courseTitle,
  courseId,
  lessonSlug,
  errorcode,
  message,
}: Props) {
  const { user } = useAuthUser();
  const isBlocked = errorcode === "LESSON_ACCESS_BLOCKED";

  const whatsAppHref = useMemo(() => {
    const userLabel = user
      ? [user.firstname, user.lastname].filter(Boolean).join(" ") ||
        user.email ||
        user.username
      : undefined;

    return buildLessonDeviceSupportWhatsAppUrl({
      courseTitle,
      courseId,
      lessonSlug,
      userId: user?._id,
      userLabel,
      reason: isBlocked ? "access_blocked" : "device_elsewhere",
    });
  }, [courseId, courseTitle, isBlocked, lessonSlug, user]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card className="space-y-4 p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Shield className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          {isBlocked
            ? "Lesson access suspended"
            : "Registered on another device"}
        </h2>
        <p className="text-sm text-slate-600">{message}</p>
        <p className="text-sm text-slate-500">
          Course playback is limited to one device per account. Contact support
          if you need to change your registered device.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <WhatsAppContactButton
            href={whatsAppHref}
            label="Contact support"
            className="sm:w-auto"
          />
          <Link href={getLmsUrl(`/courses/${courseSlug}`)}>
            <Button variant="outline" className="w-full sm:w-auto">
              Back to course
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
