export type Ticket = {
  id: string;
  name: string;
  email: string;
  subject: string;
  agent: string;
  status: string;
  madeBy: string;
  lastActivity: any; // Firestore Timestamp
  priority: string;
  lastMessage: any; // Firestore Timestamp
  dateCreated: any; // Firestore Timestamp
  folder: string;
  attachmentLink: string;
  followers: string[];
  tags?: string[];
  message?: string;
  source?: string;
  rating?: string;
};

export type FilterMap = {
  [key: string]: any[];
};
