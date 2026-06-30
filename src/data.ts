import { Post, User } from './types';

// --- MOCK SVG ASSETS (For beautiful initial feed rendering) ---
export const SVGS = {
    pothole: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><rect x='0' y='120' width='400' height='100' fill='%23334155'/><line x1='0' y1='170' x2='400' y2='170' stroke='%23fef08a' stroke-dasharray='10,15' stroke-width='4'/><ellipse cx='200' cy='175' rx='60' ry='25' fill='%230f172a'/><path d='M150,170 Q180,185 220,175 T250,170' stroke='%2378350f' stroke-width='4' fill='none'/><circle cx='180' cy='168' r='5' fill='%2378350f'/><circle cx='225' cy='178' r='4' fill='%2378350f'/><path d='M170,160 L160,150 M230,190 L245,195' stroke='%23475569' stroke-width='2'/><text x='20' y='50' fill='%23f8fafc' font-family='sans-serif' font-weight='bold' font-size='20'>Main Street Pothole</text></svg>",
    streetlight: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23090d16'/><path d='M250,300 L250,100 Q250,50 200,50 Q170,50 170,70 L170,90' fill='none' stroke='%23475569' stroke-width='10' stroke-linecap='round'/><path d='M160,90 L180,90 L170,110 Z' fill='%23334155'/><circle cx='170' cy='115' r='8' fill='%2364748b'/><path d='M120,290 L220,290' stroke='%23334155' stroke-width='10' stroke-linecap='round'/><text x='20' y='50' fill='%23f8fafc' font-family='sans-serif' font-weight='bold' font-size='20'>Broken Streetlight - Sector 4</text></svg>",
    leakage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230f172a'/><rect x='0' y='200' width='400' height='100' fill='%231e293b'/><circle cx='200' cy='200' r='50' fill='%2338bdf8' opacity='0.2'/><circle cx='200' cy='200' r='30' fill='%230284c7' opacity='0.4'/><ellipse cx='200' cy='210' rx='80' ry='20' fill='%230284c7' opacity='0.6'/><rect x='100' y='180' width='200' height='15' fill='%234b5563' rx='5'/><path d='M200,185 Q205,140 180,120' stroke='%2338bdf8' stroke-width='4' fill='none'/><text x='20' y='50' fill='%23f8fafc' font-family='sans-serif' font-weight='bold' font-size='20'>Major Water Pipe Leakage</text></svg>",
    garbage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><rect x='120' y='150' width='70' height='100' fill='%2315803d' rx='10'/><rect x='130' y='140' width='50' height='10' fill='%23166534' rx='3'/><circle cx='155' cy='200' r='15' fill='none' stroke='%23166534' stroke-width='5'/><path d='M210,210 C210,180 230,170 250,190 C260,200 270,180 280,210 Z' fill='%23f59e0b' opacity='0.8'/><path d='M190,230 C200,210 220,210 230,230 Z' fill='%2378350f'/><text x='20' y='50' fill='%23f8fafc' font-family='sans-serif' font-weight='bold' font-size='20'>Overflowing Garbage Dump</text></svg>",
    fixed_pothole: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><rect x='0' y='120' width='400' height='100' fill='%23334155'/><line x1='0' y1='170' x2='400' y2='170' stroke='%23fef08a' stroke-dasharray='10,15' stroke-width='4'/><ellipse cx='200' cy='175' rx='60' ry='25' fill='%230f172a'/><ellipse cx='200' cy='175' rx='58' ry='23' fill='%231e293b'/><path d='M150,170 Q180,173 220,173 T250,170' stroke='%23475569' stroke-width='6' fill='none'/><text x='280' y='50' fill='%2322c55e' font-family='sans-serif' font-weight='bold' font-size='18'>[RESOLVED]</text><text x='20' y='50' fill='%23f8fafc' font-family='sans-serif' font-weight='bold' font-size='20'>Main Street Pothole</text></svg>"
};

export const DEFAULT_USERS: User[] = [
  {
    username: "aarav_s",
    name: "Aarav Sharma",
    mobile: "9876543210",
    role: "citizen",
    geohash: "tsg1xu", // Sector 62, Noida area prefix
    karmaPoints: 120
  },
  {
    username: "priya_m",
    name: "Priya Malik",
    mobile: "9876543211",
    role: "citizen",
    geohash: "tsg1xy",
    karmaPoints: 85
  },
  {
    username: "officer_rahul",
    name: "Rahul Kumar",
    role: "officer",
    department: "Public Works Department (PWD / Roads)",
    rank: "Road Inspector",
    efficiencyPoints: 40
  },
  {
    username: "officer_anjali",
    name: "Anjali Gupta",
    role: "officer",
    department: "Water Supply & Sanitation Board",
    rank: "Assistant Engineer",
    efficiencyPoints: 60
  }
];

export const DEFAULT_POSTS: Post[] = [
  {
    id: "post-1",
    citizenName: "Aarav Sharma",
    citizenUsername: "aarav_s",
    geohash: "tsg1xu",
    imageBefore: SVGS.pothole,
    imageAfter: null,
    category: "pothole",
    department: "Public Works Department (PWD / Roads)",
    severity: "high",
    summary: "Massive crater on Main Road crossing",
    description: "The pothole is almost 2 feet wide and causes daily traffic jams. It is highly dangerous for two-wheelers at night.",
    upvotes: ["priya_m", "officer_anjali"],
    comments: [
      { username: "priya_m", text: "Almost fell off my scooter here yesterday! Extremely unsafe.", createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString() },
      { username: "officer_rahul", text: "Tagging my team to review this site.", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-2",
    citizenName: "Priya Malik",
    citizenUsername: "priya_m",
    geohash: "tsg1xy",
    imageBefore: SVGS.streetlight,
    imageAfter: null,
    category: "damaged_streetlight",
    department: "Electricity Board (Urban Lighting)",
    severity: "medium",
    summary: "Flickering/dead streetlight in dark lane",
    description: "Streetlight ID L-402 has been dead for a week. The lane is completely dark and feels unsafe after 8 PM.",
    upvotes: ["aarav_s"],
    comments: [
      { username: "aarav_s", text: "Agreed, safety is a concern in this lane.", createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() }
    ],
    status: "pending",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-3",
    citizenName: "Kabir Das",
    citizenUsername: "kabir_d",
    geohash: "tsg1xs",
    imageBefore: SVGS.leakage,
    imageAfter: null,
    category: "water_leakage",
    department: "Water Supply & Sanitation Board",
    severity: "high",
    summary: "Burst pipe spraying clean drinking water",
    description: "Main feeder pipe near the community park has burst. Gallons of clean water are flooding the street.",
    upvotes: ["aarav_s", "priya_m", "officer_rahul"],
    comments: [
      { username: "aarav_s", text: "So much water is being wasted! Please fix this ASAP.", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }
    ],
    status: "pending",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

export const DEPARTMENTS = [
  "Public Works Department (PWD / Roads)",
  "Water Supply & Sanitation Board",
  "Electricity Board (Urban Lighting)",
  "Municipal Waste Management",
  "Urban Planning & Infrastructure"
];

export const CATEGORIES = [
  { key: "all", name: "All Infrastructure" },
  { key: "pothole", name: "Roads & Potholes", dept: "Public Works Department (PWD / Roads)" },
  { key: "damaged_streetlight", name: "Street Lighting", dept: "Electricity Board (Urban Lighting)" },
  { key: "water_leakage", name: "Water Supply & Leakage", dept: "Water Supply & Sanitation Board" },
  { key: "waste_management", name: "Sanitation & Waste", dept: "Municipal Waste Management" },
  { key: "public_infra_damage", name: "Public Infrastructure", dept: "Urban Planning & Infrastructure" }
];
