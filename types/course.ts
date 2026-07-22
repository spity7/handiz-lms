export type CourseDiscount = {
  enabled: boolean;
  type: "percent" | "fixed";
  value: number;
  endsAt?: string | null;
};

export type CoursePricing = {
  isFree: boolean;
  price: number;
  salePrice?: number;
  currency: string;
  freeEndsAt?: string | null;
  discount?: CourseDiscount;
  discountExpired?: boolean;
  freeOfferExpired?: boolean;
};

export type CourseInstructor = {
  _id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  username?: string;
};

export type Course = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  thumbnailUrl?: string;
  status: string;
  pricing: CoursePricing;
  instructorId?: CourseInstructor;
  level?: string;
  tags?: string[];
  order?: number;
  lessonCount?: number;
  totalDurationMinutes?: number;
  enrollmentCount?: number;
  publishedAt?: string | null;
  lastPublishedAt?: string | null;
  createdAt?: string;
};

export type Lesson = {
  _id: string;
  courseId: string;
  moduleId: string;
  title: string;
  slug: string;
  order: number;
  type: "video" | "text" | "quiz" | "download";
  video?: {
    provider?: "vdocipher";
    vdoCipherVideoId?: string;
    encodingStatus?: "pending" | "processing" | "ready" | "failed";
    durationSeconds?: number;
    thumbnailUrl?: string;
  };
  resources?: { title: string; url: string; fileType?: string }[];
  isPreview?: boolean;
  isPublished?: boolean;
  locked?: boolean;
  sequentiallyLocked?: boolean;
  contentBlocks?: { type: string; content: string }[];
  quiz?: {
    _id: string;
    passingScore: number;
    questions: {
      prompt: string;
      options: string[];
      correctIndex: number;
    }[];
  } | null;
};

export type CourseModule = {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
};

export type Enrollment = {
  _id: string;
  userId: string;
  courseId: Course | string;
  status: "active" | "completed" | "revoked";
  source: string;
  enrolledAt: string;
  completedAt?: string;
  progressPercent: number;
  continueLessonSlug?: string | null;
  lastLessonId?: { _id: string; title: string; slug: string };
  lastAccessedAt?: string;
};

export type LessonProgress = {
  _id: string;
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  watchedSeconds: number;
  lastPosition: number;
};

export type QuizQuestion = {
  prompt: string;
  options: string[];
};

export type Certificate = {
  _id: string;
  certificateNumber: string;
  issuedAt: string;
  pdfUrl?: string;
  courseId?: { title: string; slug: string };
  userId?: {
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
  };
};
