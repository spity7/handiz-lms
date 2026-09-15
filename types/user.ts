export type AuthUser = {
  _id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  username?: string;
  role?: string;
  canPreviewLmsContent?: boolean;
  isVerified?: boolean;
};
