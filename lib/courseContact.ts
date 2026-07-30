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
