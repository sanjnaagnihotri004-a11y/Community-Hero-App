/**
 * Types for the Community Hero Hyperlocal Civic Social Platform
 */

export interface User {
  username: string;
  name: string;
  mobile?: string;
  role: 'citizen' | 'officer';
  geohash?: string;
  karmaPoints?: number;
  department?: string;
  rank?: string;
  efficiencyPoints?: number;
}

export interface Comment {
  username: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  citizenName: string;
  citizenUsername: string;
  geohash: string;
  imageBefore: string;
  imageAfter: string | null;
  category: string;
  department: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  description: string;
  upvotes: string[]; // List of user-ids/usernames who upvoted
  comments: Comment[];
  status: 'pending' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  officerNotes?: string;
  resolutionSummary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export interface IssueAnalysisResult {
  category: 'pothole' | 'water_leakage' | 'damaged_streetlight' | 'waste_management' | 'public_infra_damage' | 'other';
  suggested_department: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  details: string;
}

export interface ResolutionVerificationResult {
  is_resolved: boolean;
  confidence: number;
  verification_summary: string;
}
