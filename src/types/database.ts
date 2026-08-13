export type Profile = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  createdAt: string;
};

export type Project = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  techStack: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectImage = {
  id: string;
  projectId: string;
  imageUrl: string;
  position: number;
};

export type Like = {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  createdAt: string;
};
