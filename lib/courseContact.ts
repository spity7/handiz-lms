import { getDashboardUrl } from "@/lib/urls";

/** E.164 without + (wa.me format) */
export const WHATSAPP_COURSE_CONTACT_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "96171601751";

export function buildAdminEnrollmentLink(params: {
  courseId: string;
  userId?: string;
}) {
  const qs = new URLSearchParams({ enroll: "1", courseId: params.courseId });
  if (params.userId) qs.set("userId", params.userId);
  return getDashboardUrl(`/ecommerce/courses/enrollments?${qs.toString()}`);
}

export function buildAdminLessonDeviceLink(params: { userId: string }) {
  const qs = new URLSearchParams({
    openDevice: "1",
    userId: params.userId,
  });
  return getDashboardUrl(`/ecommerce/courses/lesson-devices?${qs.toString()}`);
}

export function buildCourseInterestWhatsAppUrl(options: {
  courseTitle: string;
  courseId: string;
  userId?: string;
  userLabel?: string;
}) {
  const enrollLink = buildAdminEnrollmentLink({
    courseId: options.courseId,
    userId: options.userId,
  });

  const lines = [`Hi, I'm interested in the course "${options.courseTitle}".`];
  if (options.userLabel) {
    lines.push(`Student: ${options.userLabel}`);
  }
  lines.push("");
  lines.push("Enroll Link:");
  lines.push(enrollLink);

  const text = lines.join("\n");
  return `https://wa.me/${WHATSAPP_COURSE_CONTACT_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function buildLessonDeviceSupportWhatsAppUrl(options: {
  courseTitle: string;
  courseId: string;
  lessonSlug?: string;
  userId?: string;
  userLabel?: string;
  reason: "device_elsewhere" | "access_blocked";
}) {
  const adminLink = options.userId
    ? buildAdminLessonDeviceLink({ userId: options.userId })
    : undefined;

  const lines =
    options.reason === "access_blocked"
      ? ["Hi, my lesson access has been suspended and I need help."]
      : ["Hi, I need to change my registered lesson device."];

  lines.push("");
  lines.push(`Course: "${options.courseTitle}"`);
  if (options.lessonSlug) {
    lines.push(`Lesson: ${options.lessonSlug}`);
  }
  if (options.userLabel) {
    lines.push(`Student: ${options.userLabel}`);
  }
  lines.push("");

  if (options.reason === "device_elsewhere") {
    lines.push(
      "I'm trying to watch from a new device but my account is registered on another device.",
    );
    lines.push("");
  }

  if (adminLink) {
    lines.push("Admin device link:");
    lines.push(adminLink);
  }

  const text = lines.join("\n");
  return `https://wa.me/${WHATSAPP_COURSE_CONTACT_NUMBER}?text=${encodeURIComponent(text)}`;
}
