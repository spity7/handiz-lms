import { getDashboardUrl } from "@/lib/urls";

/** E.164 without + (wa.me format) */
export const WHATSAPP_COURSE_CONTACT_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "96171601751";

export const COURSE_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_COURSE_CONTACT_EMAIL?.trim() || "info@handiz.org";

export type CourseInterestContactOptions = {
  courseTitle: string;
  courseId: string;
  userId?: string;
  userLabel?: string;
};

function buildCourseInterestMessage(options: CourseInterestContactOptions) {
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

  return {
    subject: `Course enrollment: ${options.courseTitle}`,
    body: lines.join("\n"),
  };
}

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

export function buildCourseInterestWhatsAppUrl(
  options: CourseInterestContactOptions,
) {
  const { body } = buildCourseInterestMessage(options);
  return `https://wa.me/${WHATSAPP_COURSE_CONTACT_NUMBER}?text=${encodeURIComponent(body)}`;
}

/** Opens Gmail compose in the browser (same pre-filled message as WhatsApp). */
export function buildCourseInterestGmailUrl(
  options: CourseInterestContactOptions,
) {
  const { subject, body } = buildCourseInterestMessage(options);
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: COURSE_CONTACT_EMAIL,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export type LessonDeviceSupportContactOptions = {
  courseTitle: string;
  courseId: string;
  lessonSlug?: string;
  userId?: string;
  userLabel?: string;
  reason: "device_elsewhere" | "access_blocked";
};

function buildLessonDeviceSupportMessage(
  options: LessonDeviceSupportContactOptions,
) {
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

  const subject =
    options.reason === "access_blocked"
      ? `Lesson access suspended: ${options.courseTitle}`
      : `Lesson device change: ${options.courseTitle}`;

  return { subject, body: lines.join("\n") };
}

export function buildLessonDeviceSupportWhatsAppUrl(
  options: LessonDeviceSupportContactOptions,
) {
  const { body } = buildLessonDeviceSupportMessage(options);
  return `https://wa.me/${WHATSAPP_COURSE_CONTACT_NUMBER}?text=${encodeURIComponent(body)}`;
}

export function buildLessonDeviceSupportGmailUrl(
  options: LessonDeviceSupportContactOptions,
) {
  const { subject, body } = buildLessonDeviceSupportMessage(options);
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: COURSE_CONTACT_EMAIL,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
