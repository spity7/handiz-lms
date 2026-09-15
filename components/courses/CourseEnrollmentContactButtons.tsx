import GmailContactButton from "@/components/courses/GmailContactButton";
import WhatsAppContactButton from "@/components/courses/WhatsAppContactButton";

type CourseEnrollmentContactButtonsProps = {
  whatsAppHref: string;
  gmailHref: string;
  size?: "default" | "lg";
};

export default function CourseEnrollmentContactButtons({
  whatsAppHref,
  gmailHref,
  size = "default",
}: CourseEnrollmentContactButtonsProps) {
  return (
    <div className="flex flex-col gap-2">
      <WhatsAppContactButton href={whatsAppHref} size={size} />
      <GmailContactButton href={gmailHref} size={size} />
    </div>
  );
}
