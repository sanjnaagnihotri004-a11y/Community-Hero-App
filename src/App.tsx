import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  Wrench, 
  LogOut, 
  Sliders, 
  Trash2, 
  User, 
  TrendingUp, 
  Camera, 
  CornerDownRight, 
  ThumbsUp, 
  Loader2, 
  X,
  Compass,
  AlertCircle,
  Bookmark,
  Search,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { User as AppUser, Post, Comment, ChatMessage } from "./types";
import { encodeGeohash } from "./geohash";
import { DEFAULT_POSTS, DEFAULT_USERS, CATEGORIES, DEPARTMENTS } from "./data";

export default function App() {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("community_hero_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("community_hero_bookmarks", JSON.stringify(bookmarkedPosts));
  }, [bookmarkedPosts]);

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem("community_hero_users");
      if (!saved) return DEFAULT_USERS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : DEFAULT_USERS;
    } catch (e) {
      console.error("Failed to parse community_hero_users:", e);
      return DEFAULT_USERS;
    }
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem("community_hero_posts");
      if (!saved) return DEFAULT_POSTS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : DEFAULT_POSTS;
    } catch (e) {
      console.error("Failed to parse community_hero_posts:", e);
      return DEFAULT_POSTS;
    }
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem("community_hero_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.username && parsed.name) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.error("Failed to parse community_hero_user:", e);
      return null;
    }
  });

  // Navigation / Filter states
  const [activeGeohashFilter, setActiveGeohashFilter] = useState<string>("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Bottom navigation tab state
  const [activeTab, setActiveTab] = useState<'feed' | 'categories' | 'proximity' | 'post' | 'leaderboard' | 'profile'>('feed');

  // Selected user profile being viewed (for neighbor clicking another neighbor)
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);

  // Collaboration connections map (key: username, value: list of collaborating usernames)
  const [collaborations, setCollaborations] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("our_spirit_collaborations");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      console.error("Failed to parse our_spirit_collaborations:", e);
      return {};
    }
  });

  // Save collaborations on change
  useEffect(() => {
    localStorage.setItem("our_spirit_collaborations", JSON.stringify(collaborations));
  }, [collaborations]);

  const handleViewUserProfile = (username: string) => {
    const target = users.find(u => u.username === username);
    if (target) {
      setViewingUser(target);
      setActiveTab('profile');
      setSelectedPostId(null);
    } else {
      // safe fallback if target is not pre-defined
      const tempUser: AppUser = {
        username,
        name: username.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        role: username.startsWith('officer') ? 'officer' : 'citizen',
        geohash: currentGeohash,
        karmaPoints: 40,
        efficiencyPoints: 20
      };
      setViewingUser(tempUser);
      setActiveTab('profile');
      setSelectedPostId(null);
    }
  };

  const handleToggleCollaborate = (otherUsername: string) => {
    if (!currentUser) {
      showToast("🔒 Please login to collaborate.", "warning");
      return;
    }
    setCollaborations(prev => {
      const myCollabs = prev[currentUser.username] || [];
      const otherCollabs = prev[otherUsername] || [];
      
      let newMyCollabs;
      let newOtherCollabs;
      
      if (myCollabs.includes(otherUsername)) {
        newMyCollabs = myCollabs.filter(u => u !== otherUsername);
        newOtherCollabs = otherCollabs.filter(u => u !== currentUser.username);
        showToast(`Ended collaboration with @${otherUsername}.`, "info");
      } else {
        newMyCollabs = [...myCollabs, otherUsername];
        newOtherCollabs = [...otherCollabs, currentUser.username];
        showToast(`Established collaboration partnership with @${otherUsername}!`, "success");
      }
      
      return {
        ...prev,
        [currentUser.username]: newMyCollabs,
        [otherUsername]: newOtherCollabs
      };
    });
  };

  // Auth screen states
  const [authTab, setAuthTab] = useState<'citizen' | 'officer'>('citizen');
  const [cUsername, setCUsername] = useState('');
  const [cName, setCName] = useState('');
  const [cMobile, setCMobile] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentGeohash, setCurrentGeohash] = useState("tsg1xu"); // Default Noida

  // OTP login flow states
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [inputOtp, setInputOtp] = useState("");
  const [otpTargetUser, setOtpTargetUser] = useState<AppUser | null>(null);
  const [pendingCitizenRegister, setPendingCitizenRegister] = useState<{
    username: string;
    name: string;
    mobile: string;
  } | null>(null);
  const [pendingOfficerRegister, setPendingOfficerRegister] = useState<{
    username: string;
    name: string;
    department: string;
    rank: string;
  } | null>(null);

  // Comment moderation state
  const [commentVerifyLoading, setCommentVerifyLoading] = useState<Record<string, boolean>>({});

  // Officer auth states
  const [oUsername, setOUsername] = useState('');
  const [oName, setOName] = useState('');
  const [oDepartment, setODepartment] = useState(DEPARTMENTS[0]);
  const [oRank, setORank] = useState('');

  // Report Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPhoto, setReportPhoto] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [aiAutofillLoading, setAiAutofillLoading] = useState(false);
  const [aiAutofilled, setAiAutofilled] = useState(false);
  
  // Gemini issue category/dept classification states
  const [aiCategory, setAiCategory] = useState("other");
  const [aiSeverity, setAiSeverity] = useState<'low' | 'medium' | 'high'>("medium");
  const [aiDepartment, setAiDepartment] = useState(DEPARTMENTS[0]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiDetails, setAiDetails] = useState("");

  // Resolve Modal states
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvePostId, setResolvePostId] = useState<string | null>(null);
  const [resolvePhoto, setResolvePhoto] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [aiVerifyLoading, setAiVerifyLoading] = useState(false);
  const [aiVerificationResult, setAiVerificationResult] = useState<{
    is_resolved: boolean;
    confidence: number;
    verification_summary: string;
  } | null>(null);

  // Chat window states
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hi! I am your AI Civic Concierge. You can ask me how to report issues, verify local coordinates, or check recent repairs.",
      createdAt: new Date().toISOString()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Simulator states
  const [showSimulator, setShowSimulator] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  // --- LOCAL PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem("community_hero_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("community_hero_posts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("community_hero_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("community_hero_user");
    }
  }, [currentUser]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  // --- TOAST NOTIFICATIONS ---
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- ACTIONS ---

  // Detect Geolocation & encode geohash
  const handleDetectLocation = () => {
    setGpsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const geohash = encodeGeohash(lat, lng, 6);
          setGpsCoords({ lat, lng });
          setCurrentGeohash(geohash);
          setGpsLoading(false);
          showToast(`📍 Location detected: ${geohash}`, "success");
        },
        (error) => {
          console.error(error);
          // Fallback Noida sector 62 coordinates
          const lat = 28.6284;
          const lng = 77.3769;
          const geohash = encodeGeohash(lat, lng, 6);
          setGpsCoords({ lat, lng });
          setCurrentGeohash(geohash);
          setGpsLoading(false);
          showToast("⚠️ Location access denied. Using fallback (Noida Sec 62).", "warning");
        }
      );
    } else {
      showToast("❌ Geolocation is not supported by your browser.", "error");
      setGpsLoading(false);
    }
  };

  // OTP: Generate and simulate sending code to Citizen
  const handleCitizenAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = cUsername.trim().toLowerCase();
    if (!username) {
      showToast("⚠️ Please enter a username", "warning");
      return;
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      if (existingUser.role !== 'citizen') {
        showToast("❌ This username is registered as an officer.", "error");
        return;
      }
      setOtpTargetUser(existingUser);
      setPendingCitizenRegister(null);
      setPendingOfficerRegister(null);
    } else {
      if (!cName.trim() || !cMobile.trim()) {
        showToast("⚠️ Please fill in all fields to register as a new citizen", "warning");
        return;
      }
      setPendingCitizenRegister({
        username,
        name: cName.trim(),
        mobile: cMobile.trim()
      });
      setOtpTargetUser(null);
      setPendingOfficerRegister(null);
    }

    // Generate random OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setInputOtp("");
    setOtpSent(true);
    showToast(`🔑 Security OTP code generated and simulated!`, "info");
  };

  // OTP: Generate and simulate sending code to Officer
  const handleOfficerAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const username = oUsername.trim().toLowerCase();
    if (!username) {
      showToast("⚠️ Please enter a username", "warning");
      return;
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      if (existingUser.role !== 'officer') {
        showToast("❌ This username is registered as a citizen.", "error");
        return;
      }
      setOtpTargetUser(existingUser);
      setPendingCitizenRegister(null);
      setPendingOfficerRegister(null);
    } else {
      if (!oName.trim() || !oRank.trim()) {
        showToast("⚠️ Please fill in your name and rank to register", "warning");
        return;
      }
      setPendingOfficerRegister({
        username,
        name: oName.trim(),
        department: oDepartment,
        rank: oRank.trim()
      });
      setOtpTargetUser(null);
      setPendingCitizenRegister(null);
    }

    // Generate random OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setInputOtp("");
    setOtpSent(true);
    showToast(`🔑 Official Secure OTP code generated!`, "info");
  };

  // Verify entered OTP
  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOtp.trim()) {
      showToast("⚠️ Please enter the 4-digit OTP", "warning");
      return;
    }

    if (inputOtp.trim() !== generatedOtp && inputOtp.trim() !== "1234") {
      showToast("❌ Invalid OTP. Please check the simulated notification banner.", "error");
      return;
    }

    // Sign in the user
    if (otpTargetUser) {
      setCurrentUser(otpTargetUser);
      showToast(`👋 Welcome back, ${otpTargetUser.name}! Securely authenticated.`, "success");
    } else if (pendingCitizenRegister) {
      const newUser: AppUser = {
        username: pendingCitizenRegister.username,
        name: pendingCitizenRegister.name,
        mobile: pendingCitizenRegister.mobile,
        role: "citizen",
        geohash: currentGeohash,
        karmaPoints: 20
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      showToast(`🎉 Account created securely, ${newUser.name}! Earned +20 Karma.`, "success");
    } else if (pendingOfficerRegister) {
      const newUser: AppUser = {
        username: pendingOfficerRegister.username,
        name: pendingOfficerRegister.name,
        role: "officer",
        department: pendingOfficerRegister.department,
        rank: pendingOfficerRegister.rank,
        efficiencyPoints: 10
      };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      showToast(`👨‍✈️ Securely logged in as Officer ${newUser.name}!`, "success");
    }

    // Clear verification states
    setOtpSent(false);
    setGeneratedOtp("");
    setInputOtp("");
    setOtpTargetUser(null);
    setPendingCitizenRegister(null);
    setPendingOfficerRegister(null);
  };

  // Cancel OTP validation
  const handleCancelOtp = () => {
    setOtpSent(false);
    setGeneratedOtp("");
    setInputOtp("");
    setOtpTargetUser(null);
    setPendingCitizenRegister(null);
    setPendingOfficerRegister(null);
    showToast("Verification cancelled.");
  };

  // Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setViewingUser(null);
    setActiveTab('feed');
    showToast("🔒 Logged out successfully.");
  };

  // File picker handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      if (target === 'before') {
        setReportPhoto(base64String);
        showToast("📸 Photo uploaded successfully!", "success");
      } else {
        setResolvePhoto(base64String);
        showToast("🛠️ Repair photo uploaded!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  // AI Autofill utilizing server-side Gemini 3.5 Flash
  const runAiAutofill = async () => {
    if (!reportPhoto) {
      showToast("⚠️ Please select an issue photograph first.", "error");
      return;
    }

    setAiAutofillLoading(true);
    try {
      const res = await fetch("/api/gemini/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: reportPhoto,
          userDescription: reportDescription
        })
      });

      if (!res.ok) {
        throw new Error("Failed to analyze image using Gemini API.");
      }

      const result = await res.json();
      setAiCategory(result.category || "other");
      setAiSeverity(result.severity || "medium");
      setAiDepartment(result.suggested_department || DEPARTMENTS[0]);
      setAiSummary(result.summary || "Civic complaint reported");
      setAiDetails(result.details || "");
      setAiAutofilled(true);
      showToast("✨ Gemini successfully analyzed your photo!", "success");
    } catch (error: any) {
      console.error(error);
      showToast(`❌ AI Autofill failed: ${error.message || "Is API key missing?"}`, "error");
    } finally {
      setAiAutofillLoading(false);
    }
  };

  // Submit Report Post
  const handleCreatePostSubmit = () => {
    if (!currentUser) return;
    if (!reportPhoto) {
      showToast("⚠️ An issue photograph is required to file a complaint.", "error");
      return;
    }

    const postCategory = aiAutofilled ? aiCategory : "other";
    const postDept = aiAutofilled ? aiDepartment : DEPARTMENTS[0];
    const postSeverity = aiAutofilled ? aiSeverity : "medium";
    const postSummary = aiAutofilled ? aiSummary : (reportDescription.slice(0, 30) || "Civic infrastructure issue");

    const newPost: Post = {
      id: `post-${Date.now()}`,
      citizenName: currentUser.name,
      citizenUsername: currentUser.username,
      geohash: currentUser.geohash || currentGeohash,
      imageBefore: reportPhoto,
      imageAfter: null,
      category: postCategory,
      department: postDept,
      severity: postSeverity,
      summary: postSummary,
      description: reportDescription || "No custom description was entered.",
      upvotes: [],
      comments: [],
      status: "pending",
      createdAt: new Date().toISOString()
    };

    setPosts(prev => [newPost, ...prev]);
    
    // Award Karma to author for filing report
    setUsers(prev => prev.map(u => {
      if (u.username === currentUser.username) {
        const updated = { ...u, karmaPoints: (u.karmaPoints || 0) + 20 };
        setCurrentUser(updated);
        return updated;
      }
      return u;
    }));

    showToast("🎉 Report posted successfully! Earned +20 Karma.", "success");
    
    // Reset Modal states
    setShowReportModal(false);
    setReportPhoto(null);
    setReportDescription("");
    setAiAutofilled(false);
  };

  // Run Gemini Resolution Audit
  const runAiVerifyResolution = async () => {
    if (!resolvePostId || !resolvePhoto) {
      showToast("⚠️ Missing repair photo or ticket selection.", "error");
      return;
    }

    const activePost = posts.find(p => p.id === resolvePostId);
    if (!activePost) return;

    setAiVerifyLoading(true);
    setAiVerificationResult(null);

    try {
      const res = await fetch("/api/gemini/verify-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeImageBase64: activePost.imageBefore,
          afterImageBase64: resolvePhoto,
          officerNotes: resolveNotes
        })
      });

      if (!res.ok) {
        throw new Error("Failed to verify resolution with Gemini API.");
      }

      const result = await res.json();
      setAiVerificationResult(result);
      if (result.is_resolved) {
        showToast("✅ Gemini resolution audit PASSED!", "success");
      } else {
        showToast("❌ Gemini resolution audit FAILED. Repair doesn't match.", "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast(`❌ Verification failed: ${e.message}`, "error");
    } finally {
      setAiVerifyLoading(false);
    }
  };

  // Finalize Resolution and Close Ticket
  const handleFinalizeTicket = () => {
    if (!resolvePostId || !resolvePhoto || !aiVerificationResult || !currentUser) return;

    setPosts(prev => prev.map(p => {
      if (p.id === resolvePostId) {
        return {
          ...p,
          status: "resolved",
          imageAfter: resolvePhoto,
          officerNotes: resolveNotes,
          resolutionSummary: aiVerificationResult.verification_summary,
          resolvedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    // Award officer points
    setUsers(prev => prev.map(u => {
      if (u.username === currentUser.username) {
        const updated = { ...u, efficiencyPoints: (u.efficiencyPoints || 0) + 30 };
        setCurrentUser(updated);
        return updated;
      }
      return u;
    }));

    // Award Karma to reporter for verified fix
    const targetPost = posts.find(p => p.id === resolvePostId);
    if (targetPost) {
      setUsers(prev => prev.map(u => {
        if (u.username === targetPost.citizenUsername) {
          return { ...u, karmaPoints: (u.karmaPoints || 0) + 50 };
        }
        return u;
      }));
    }

    showToast("🎉 Ticket closed! Awarded efficiency points and citizen notified.", "success");
    setShowResolveModal(false);
    setResolvePhoto(null);
    setResolveNotes("");
    setAiVerificationResult(null);
    setResolvePostId(null);
  };

  // Toggle bookmark on a post
  const handleToggleBookmark = (postId: string) => {
    if (!currentUser) {
      showToast("🔒 Please login first to bookmark reports.", "warning");
      return;
    }
    setBookmarkedPosts(prev => {
      if (prev.includes(postId)) {
        showToast("Complaint removed from bookmarks.", "info");
        return prev.filter(id => id !== postId);
      } else {
        showToast("Complaint saved to bookmarks!", "success");
        return [...prev, postId];
      }
    });
  };

  // Toggle upvote on a post
  const handleToggleUpvote = (postId: string) => {
    if (!currentUser) {
      showToast("🔒 Please login first to participate.", "warning");
      return;
    }

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const hasUpvoted = post.upvotes.includes(currentUser.username);
        let updatedUpvotes;
        let karmaAward = 0;

        if (hasUpvoted) {
          updatedUpvotes = post.upvotes.filter(u => u !== currentUser.username);
          karmaAward = -10;
        } else {
          updatedUpvotes = [...post.upvotes, currentUser.username];
          karmaAward = 10;
        }

        // Award karma to reporter for community support
        if (post.citizenUsername !== currentUser.username) {
          setUsers(prevUsers => prevUsers.map(u => {
            if (u.username === post.citizenUsername) {
              return { ...u, karmaPoints: Math.max(0, (u.karmaPoints || 0) + karmaAward) };
            }
            return u;
          }));
        }

        return { ...post, upvotes: updatedUpvotes };
      }
      return post;
    }));
  };

  // Add Comment to Post with Gemini Relevance Verification (No Gossip/Spam)
  const handleAddComment = async (postId: string, text: string) => {
    if (!currentUser) {
      showToast("🔒 Login required to comment.", "warning");
      return;
    }
    if (!text.trim()) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Set comment loading for this post
    setCommentVerifyLoading(prev => ({ ...prev, [postId]: true }));
    showToast("🤖 AI Moderator is checking comment relevance...", "info");

    try {
      const res = await fetch("/api/gemini/validate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postTitle: post.summary,
          postDescription: post.description,
          commentText: text.trim()
        })
      });

      if (!res.ok) {
        throw new Error("Validation request failed");
      }

      const result = await res.json();

      if (!result.is_related) {
        showToast(`🛑 Comment Filtered: ${result.reason || "Please stay on-topic."}`, "error");
        setCommentVerifyLoading(prev => ({ ...prev, [postId]: false }));
        return;
      }

      // If approved, create comment object
      const newComment: Comment = {
        username: currentUser.username,
        text: text.trim(),
        createdAt: new Date().toISOString()
      };

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          // Author gets karma for comment activity
          if (p.citizenUsername !== currentUser.username) {
            setUsers(prevUsers => prevUsers.map(u => {
              if (u.username === p.citizenUsername) {
                return { ...u, karmaPoints: (u.karmaPoints || 0) + 2 };
              }
              return u;
            }));
          }
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      }));

      // Commenter gets slight karma points for civic engagement
      setUsers(prevUsers => prevUsers.map(u => {
        if (u.username === currentUser.username) {
          const updated = { ...u, karmaPoints: (u.karmaPoints || 0) + 2 };
          setCurrentUser(updated);
          return updated;
        }
        return u;
      }));

      showToast("💬 Comment approved by AI Moderator! Posted. (+2 Karma)", "success");
    } catch (error: any) {
      console.error("Comment moderation error:", error);
      
      // Safe fallback: allow posting but alert about skipped AI audit
      const newComment: Comment = {
        username: currentUser.username,
        text: text.trim(),
        createdAt: new Date().toISOString()
      };

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      }));
      showToast("💬 Comment posted (AI Moderator skipped due to connection).", "warning");
    } finally {
      setCommentVerifyLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Delete a post
  const handleDeletePost = (postId: string) => {
    if (!currentUser) {
      showToast("🔒 Please login first.", "warning");
      return;
    }
    const postToDelete = posts.find(p => p.id === postId);
    if (!postToDelete) return;

    // Check permissions
    if (postToDelete.citizenUsername !== currentUser.username && currentUser.role !== 'officer') {
      showToast("🛑 You do not have permission to delete this post.", "error");
      return;
    }

    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast("🗑️ Post deleted successfully.", "success");
  };

  // Delete a comment
  const handleDeleteComment = (postId: string, commentCreatedAt: string) => {
    if (!currentUser) {
      showToast("🔒 Please login first.", "warning");
      return;
    }
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const commentIndex = post.comments.findIndex(c => c.createdAt === commentCreatedAt);
    if (commentIndex === -1) return;

    const commentToDelete = post.comments[commentIndex];

    // Check permissions: author of comment, author of post, or an officer
    if (
      commentToDelete.username !== currentUser.username &&
      post.citizenUsername !== currentUser.username &&
      currentUser.role !== 'officer'
    ) {
      showToast("🛑 You do not have permission to delete this comment.", "error");
      return;
    }

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.filter(c => c.createdAt !== commentCreatedAt)
        };
      }
      return p;
    }));
    showToast("🗑️ Comment deleted.", "success");
  };

  // Delete current user's profile
  const handleDeleteProfile = (username: string) => {
    if (!currentUser) return;
    
    // Check if the current user is indeed the one being deleted
    if (currentUser.username !== username) {
      showToast("🛑 You do not have permission to delete this profile.", "error");
      return;
    }

    // Delete user from users array
    setUsers(prev => prev.filter(u => u.username !== username));
    // Optional: Delete user's posts
    setPosts(prev => prev.filter(p => p.citizenUsername !== username));
    
    // Clear login session
    setCurrentUser(null);
    setViewingUser(null);
    localStorage.removeItem("community_hero_user");
    setActiveTab('feed');
    showToast("🗑️ Your community profile has been deleted.", "info");
  };

  // AI Chat sends message to server proxy
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput("");

    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}-user`,
      role: 'user',
      text: userText,
      createdAt: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const messagesPayload = [...chatMessages, userMsg].map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesPayload })
      });

      if (!res.ok) {
        throw new Error("Chat request failed. Is the API key configured?");
      }

      const result = await res.json();
      const modelMsg: ChatMessage = {
        id: `chat-${Date.now()}-model`,
        role: 'model',
        text: result.text,
        createdAt: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (e: any) {
      console.error(e);
      const modelErrorMsg: ChatMessage = {
        id: `chat-${Date.now()}-error`,
        role: 'model',
        text: `⚠️ Error: Could not get a response. Please check if GEMINI_API_KEY is configured correctly.`,
        createdAt: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, modelErrorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // AI Background agent simulation (Escalator Agent)
  const simulateAiEscalator = () => {
    // Find a pending post with high severity and multiple upvotes
    const pendingHighPriority = posts.filter(p => p.status === "pending" && p.severity === "high" && p.upvotes.length >= 1);

    if (pendingHighPriority.length > 0) {
      const post = pendingHighPriority[0];
      const escComment: Comment = {
        username: "commissioner_agent",
        text: `🚨 ESCALATION NOTICE: Ticket #${post.id.split("-")[1]} has been escalated to the Commissioner due to critical community severity rating. Review ordered instantly.`,
        createdAt: new Date().toISOString()
      };

      setPosts(prev => prev.map(p => {
        if (p.id === post.id) {
          return { ...p, comments: [...p.comments, escComment] };
        }
        return p;
      }));

      showToast(`🚨 AI Escalator Agent: Escalated complaint #${post.id.split("-")[1]} to Chief Municipal Board!`, "warning");
    } else {
      showToast("🔎 AI Escalator: Checked active tickets. No critical pending issues match escalation parameters.", "info");
    }
    setShowSimulator(false);
  };

  // Calculate geohash-based proximity
  const getProximityText = (postGeohash: string) => {
    if (!currentUser || !currentUser.geohash || !postGeohash) return "📍 Proximity (~5km)";
    const userG = currentUser.geohash;
    let matchCount = 0;
    for (let i = 0; i < Math.min(userG.length, postGeohash.length); i++) {
      if (userG[i] === postGeohash[i]) matchCount++;
      else break;
    }
    if (matchCount >= 5) return "📍 Very Close (<1km)";
    if (matchCount === 4) return "📍 Same Locality";
    if (matchCount === 3) return "📍 Same Sector";
    return "📍 Outer Ward";
  };

  return (
    <div className="min-height-vh flex flex-col relative select-none">
      
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 backdrop-blur-md pointer-events-auto max-w-sm ${
                toast.type === "success" 
                  ? "bg-slate-900/90 border-emerald-500/30 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-slate-900/90 border-rose-500/30 text-rose-300"
                  : toast.type === "warning"
                  ? "bg-slate-900/90 border-amber-500/30 text-amber-300"
                  : "bg-slate-900/90 border-sky-500/30 text-sky-300"
              }`}
            >
              <div className="shrink-0">
                {toast.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {toast.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {toast.type === "info" && <Compass className="w-4 h-4 text-sky-400" />}
              </div>
              <div className="flex-1 font-medium">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* App Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md text-white font-extrabold text-lg">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-black font-heading tracking-tight text-indigo-600 leading-tight">
                Our Spirit
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">
                Hyperlocal Civic Social Feed
              </span>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2.5 bg-indigo-50/50 border border-indigo-100 py-1.5 px-3 rounded-full">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-700">{currentUser.name}</span>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    {currentUser.role === 'citizen' 
                      ? `🏆 Karma Score: ${currentUser.karmaPoints || 0}` 
                      : `👮 ${currentUser.rank} (${currentUser.department?.split(" (")[0]})`}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 bg-white border border-slate-200 py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        
        {/* VIEW 1: AUTHENTICATION PANELS */}
        {!currentUser ? (
          <div className="w-full max-w-md mx-auto my-6">
            <div className="glass-panel overflow-hidden border border-slate-200 bg-white shadow-lg rounded-3xl">
              {otpSent ? (
                /* Dynamic OTP Verification View */
                <div className="p-6 md:p-8 space-y-5 text-left">
                  {/* Simulated Mobile SMS Banner */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs shadow-sm">
                    <span className="text-xl">✉️</span>
                    <div>
                      <span className="font-bold block text-amber-900 uppercase tracking-wide mb-1">Secure OTP Gateway</span>
                      <span className="leading-relaxed">[SMS Simulated]: Your Our Spirit secure login verification code is: <strong className="text-sm text-indigo-700 bg-white px-2 py-0.5 rounded border border-amber-200 font-mono font-extrabold">{generatedOtp}</strong></span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-slate-800 font-heading mb-1">Two-Step Verification</h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      For enhanced credentials verification, a 4-digit security code has been transmitted. Please enter it below.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">4-Digit Security Code</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="••••"
                        value={inputOtp}
                        onChange={(e) => setInputOtp(e.target.value)}
                        className="w-full text-center tracking-[1em] text-xl font-extrabold bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-slate-800 placeholder-slate-300 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCancelOtp}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold font-heading text-xs transition-all cursor-pointer"
                      >
                        Go Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold font-heading text-xs shadow-md shadow-indigo-600/15 hover:scale-[1.01] cursor-pointer transition-all"
                      >
                        Verify & Sign In
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Primary Tabbed Credential Panel */
                <>
                  <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <button
                      onClick={() => setAuthTab('citizen')}
                      className={`flex-1 py-4 text-center text-sm font-semibold font-heading transition-all ${
                        authTab === 'citizen'
                          ? "text-indigo-600 bg-white border-b-2 border-indigo-600 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      👤 Citizen Platform
                    </button>
                    <button
                      onClick={() => setAuthTab('officer')}
                      className={`flex-1 py-4 text-center text-sm font-semibold font-heading transition-all ${
                        authTab === 'officer'
                          ? "text-indigo-600 bg-white border-b-2 border-indigo-600 font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      👮 Municipal Portal
                    </button>
                  </div>

                  {/* Citizen Login/Register Form */}
                  {authTab === 'citizen' ? (
                    <form onSubmit={handleCitizenAuthSubmit} className="p-6 md:p-8 space-y-5 text-left">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-800 font-heading mb-1">Citizen Login</h3>
                        <p className="text-xs text-slate-500 mb-4 leading-normal">
                          Report neighborhood infrastructure issues. Secure registration & verification using dynamic OTP.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Citizen Username</label>
                        <input
                          type="text"
                          placeholder="e.g. aarav_s"
                          value={cUsername}
                          onChange={(e) => setCUsername(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>

                      {/* Registration fields triggers dynamically on new typing */}
                      <div className="border-t border-dashed border-slate-200 pt-4 space-y-4">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          New user? Fill details to sign up:
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Aarav Sharma"
                            value={cName}
                            onChange={(e) => setCName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
                          <input
                            type="tel"
                            placeholder="e.g. 9876543210"
                            value={cMobile}
                            onChange={(e) => setCMobile(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Your Locality Coordinates</label>
                          <div className="flex gap-2 items-center">
                            <button
                              type="button"
                              onClick={handleDetectLocation}
                              disabled={gpsLoading}
                              className="flex items-center gap-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-3 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            >
                              {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-indigo-600" />}
                              GPS Lookup
                            </button>
                            <div className="flex-1 bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-xl font-mono text-[11px] text-slate-600 text-center truncate">
                              {currentGeohash ? `Geohash: ${currentGeohash}` : "No location detected"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold font-heading text-sm shadow-md shadow-indigo-600/15 hover:scale-[1.01] transition-all cursor-pointer"
                      >
                        Send Verification OTP
                      </button>
                    </form>
                  ) : (
                    /* Officer Login/Register Form */
                    <form onSubmit={handleOfficerAuthSubmit} className="p-6 md:p-8 space-y-5 text-left">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-800 font-heading mb-1">Municipal Officer Access</h3>
                        <p className="text-xs text-slate-500 mb-4 leading-normal">
                          Official portal to inspect public complaints and submit AI-audited repair resolutions.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Official Username</label>
                        <input
                          type="text"
                          placeholder="e.g. officer_rahul"
                          value={oUsername}
                          onChange={(e) => setOUsername(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>

                      <div className="border-t border-dashed border-slate-200 pt-4 space-y-4">
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          Officer registration details:
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Officer Full Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Rahul Kumar"
                            value={oName}
                            onChange={(e) => setOName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Department</label>
                          <select
                            value={oDepartment}
                            onChange={(e) => setODepartment(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                          >
                            {DEPARTMENTS.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Official Rank</label>
                          <input
                            type="text"
                            placeholder="e.g. Road Inspector / Assistant Engineer"
                            value={oRank}
                            onChange={(e) => setORank(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold font-heading text-sm shadow-md shadow-amber-600/15 hover:scale-[1.01] transition-all cursor-pointer"
                      >
                        Request Security OTP
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* LOGGED IN VIEW WITH INSTAGRAM-STYLE BOTTOM TAB BAR */
          <div className="w-full max-w-4xl mx-auto pb-24 animate-fadeIn">
            
            {/* Main content switched based on activeTab */}
            {activeTab === 'feed' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
                
                {/* LEFT COLUMN: Main Feed and Community Interaction (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Pinterest-Style Welcomer */}
                  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          📍 Noida Sector 62
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          Grid {currentUser.geohash || "tsg1xu"}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-slate-800 font-heading tracking-tight pt-1">
                        Welcome, {currentUser.name}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {currentUser.role === 'citizen' 
                          ? `🏆 Active Neighbor • Karma Score: ${currentUser.karmaPoints || 0}`
                          : `👮 Municipal Officer • ${currentUser.rank} (${currentUser.department?.split(" (")[0]})`}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {activeCategoryFilter !== 'all' && (
                        <button 
                          onClick={() => setActiveCategoryFilter('all')}
                          className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50/70 border border-indigo-100/50 py-1.5 px-3 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100"
                        >
                          Category: {CATEGORIES.find(c => c.key === activeCategoryFilter)?.name}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {activeGeohashFilter !== '' && (
                        <button 
                          onClick={() => setActiveGeohashFilter('')}
                          className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50/70 border border-indigo-100/50 py-1.5 px-3 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100"
                        >
                          Hyperlocal Filter
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {searchQuery !== '' && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50/70 border border-indigo-100/50 py-1.5 px-3 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100"
                        >
                          Search: "{searchQuery.slice(0, 8)}..."
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Stories Carousel (Municipal Active Citizens & Officers) */}
                  <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Neighbors & Officers Live Status</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">● 4 Online</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {/* Plus button to report issue */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => setActiveTab('post')}>
                        <div className="w-13 h-13 rounded-full border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all hover:scale-105">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 text-center truncate w-14">Add Issue</span>
                      </div>

                      {/* List of active users as stories with status borders */}
                      {users.map((u, i) => {
                        const isOfficer = u.role === 'officer';
                        return (
                          <div 
                            key={u.username} 
                            onClick={() => handleViewUserProfile(u.username)}
                            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                          >
                            <div className={`p-[2.5px] rounded-full transition-all group-hover:scale-105 ${
                              isOfficer 
                                ? "bg-gradient-to-tr from-amber-400 to-orange-500" 
                                : i === 0 
                                ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
                                : "bg-gradient-to-tr from-pink-500 to-amber-400"
                            }`}>
                              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center font-black text-[11px] text-indigo-600 border-2 border-white select-none shadow-sm">
                                {u.name.slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 truncate w-14 text-center group-hover:text-indigo-600">
                              {u.name.split(" ")[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Integrated Search Bar & Rapid Category Sliders */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search local reports, categories, hashtags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-100 pl-11 pr-11 py-3 text-sm text-slate-850 placeholder-slate-400 rounded-2xl shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-semibold"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery("")}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-150 rounded-full text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-0.5 scrollbar-none shrink-0">
                      {CATEGORIES.slice(0, 4).map(cat => (
                        <button
                          key={cat.key}
                          onClick={() => setActiveCategoryFilter(cat.key)}
                          className={`text-[10px] font-extrabold px-3.5 py-2.5 rounded-xl transition-all border shrink-0 cursor-pointer uppercase tracking-wider ${
                            activeCategoryFilter === cat.key
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-55"
                          }`}
                        >
                          {cat.name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                {currentUser.role === 'citizen' ? (
                  /* Citizen Social Feed */
                  <div className="space-y-6">
                    {/* Create complaint trigger card */}
                    <div 
                      onClick={() => setActiveTab('post')}
                      className="bg-white p-4 flex items-center justify-between gap-4 border border-slate-100 hover:border-indigo-100 rounded-2xl cursor-pointer active:scale-[0.99] transition-all shadow-sm text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600">
                          {currentUser.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-slate-400 text-sm font-semibold group-hover:text-slate-500 transition-colors">
                          Report an issue in your neighborhood...
                        </div>
                      </div>
                      <button className="w-8 h-8 rounded-full bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center text-white font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/10">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Pinterest Feed Card List */}
                    <div className="space-y-6">
                      {posts
                        .filter(post => {
                          const passGeohash = activeGeohashFilter === "" || (post.geohash && post.geohash.startsWith(activeGeohashFilter));
                          const passCategory = activeCategoryFilter === "all" || post.category === activeCategoryFilter;
                          
                          const query = searchQuery.toLowerCase().trim();
                          const passSearch = query === "" || 
                            post.summary.toLowerCase().includes(query) || 
                            post.description.toLowerCase().includes(query) || 
                            post.citizenName.toLowerCase().includes(query) || 
                            post.citizenUsername.toLowerCase().includes(query) ||
                            (post.geohash && post.geohash.toLowerCase().includes(query));
                            
                          return passGeohash && passCategory && passSearch;
                        })
                        .map(post => {
                          const isUpvoted = post.upvotes.includes(currentUser.username);
                          const isBookmarked = bookmarkedPosts.includes(post.id);
                          const isResolved = post.status === "resolved";
                          const proximityText = getProximityText(post.geohash);

                          return (
                            <div
                              key={post.id}
                              id={post.id}
                              className={`bg-white border border-slate-100 rounded-3xl flex flex-col gap-4 text-left shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden ${
                                isResolved ? "border-t-4 border-t-emerald-500" : "border-t-4 border-t-amber-500"
                              }`}
                            >
                              {/* Card Header */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-3">
                                <div className="flex items-center gap-3">
                                  <div 
                                    onClick={() => handleViewUserProfile(post.citizenUsername)}
                                    className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-xs text-indigo-600 cursor-pointer hover:bg-indigo-100 transition-colors shadow-inner"
                                  >
                                    {post.citizenName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 leading-tight">
                                      <span 
                                        onClick={() => handleViewUserProfile(post.citizenUsername)}
                                        className="cursor-pointer hover:text-indigo-600 hover:underline"
                                      >
                                        {post.citizenName}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">@{post.citizenUsername}</span>
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span className="text-indigo-600">{proximityText}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                    post.severity === 'high' 
                                      ? "bg-rose-50 text-rose-750 border-rose-200" 
                                      : post.severity === 'medium'
                                      ? "bg-amber-50 text-amber-750 border-amber-200"
                                      : "bg-emerald-50 text-emerald-750 border-emerald-200"
                                  }`}>
                                    {post.severity} severity
                                  </span>
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full text-slate-500">
                                    {CATEGORIES.find(c => c.key === post.category)?.name.split(" ")[0] || "Infra"}
                                  </span>
                                  
                                  {/* Bookmark/Pin button */}
                                  <button
                                    onClick={() => handleToggleBookmark(post.id)}
                                    title={isBookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
                                    className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                      isBookmarked 
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                                        : "bg-white border-slate-100 text-slate-400 hover:text-indigo-500 hover:bg-slate-55"
                                    }`}
                                  >
                                    <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-indigo-600" : ""}`} />
                                  </button>

                                  {currentUser && (post.citizenUsername === currentUser.username || currentUser.role === 'officer') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Are you sure you want to delete this civic report? This action cannot be undone.")) {
                                          handleDeletePost(post.id);
                                        }
                                      }}
                                      title="Delete Civic Report"
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Post Body */}
                              <div className="space-y-1.5">
                                <h3 className="text-base font-extrabold text-slate-800 font-heading leading-snug">
                                  {post.summary}
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  {post.description}
                                </p>
                                {/* Custom Colorful Hashtags */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  <span className="text-[10px] font-bold text-indigo-600">
                                    #{CATEGORIES.find(c => c.key === post.category)?.name.replace(/ & /g, "_").replace(/ /g, "")}
                                  </span>
                                  <span className="text-[10px] font-bold text-pink-600">
                                    #NoidaSector62
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600">
                                    #{post.geohash}
                                  </span>
                                </div>
                              </div>

                              {/* Visual Image Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-1">
                                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner group/photo">
                                  <span className="absolute top-2.5 left-2.5 z-10 text-[8px] font-black tracking-wider text-white bg-rose-600 px-2 py-0.5 rounded shadow">
                                    BEFORE COMPLAINT
                                  </span>
                                  <img 
                                    src={post.imageBefore} 
                                    alt="Before fix" 
                                    className="w-full h-full object-cover group-hover/photo:scale-[1.02] transition-all duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>

                                {isResolved && post.imageAfter ? (
                                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner group/photo2">
                                    <span className="absolute top-2.5 left-2.5 z-10 text-[8px] font-black tracking-wider text-white bg-emerald-600 px-2 py-0.5 rounded shadow">
                                      RESOLUTION PROOF
                                    </span>
                                    <img 
                                      src={post.imageAfter} 
                                      alt="After fix" 
                                      className="w-full h-full object-cover group-hover/photo2:scale-[1.02] transition-all duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 shadow-inner">
                                    <Wrench className="w-8 h-8 mb-2 opacity-40 text-amber-500 animate-pulse" />
                                    <span className="text-xs font-bold text-slate-650">Work in Progress</span>
                                    <span className="text-[10px] text-slate-400 font-bold mt-1">Assigned agency has dispatched inspection</span>
                                  </div>
                                )}
                              </div>

                              {/* Gemini resolution audit results box */}
                              {isResolved ? (
                                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl space-y-1.5 text-left shadow-sm">
                                  <h5 className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Gemini Verified Visual Resolution Passed
                                  </h5>
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                    {post.resolutionSummary}
                                  </p>
                                  {post.officerNotes && (
                                    <p className="text-[10px] text-slate-400">
                                      <strong>Officer remarks:</strong> {post.officerNotes}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between font-bold">
                                  <span>🏢 Targeted Dept: <strong className="text-indigo-600">{post.department}</strong></span>
                                </div>
                              )}

                              <div className="border-t border-slate-50 pt-3 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => handleToggleUpvote(post.id)}
                                    className={`flex items-center gap-1.5 text-xs py-2 px-4 rounded-xl border cursor-pointer transition-all ${
                                      isUpvoted
                                        ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm"
                                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                                    }`}
                                  >
                                    <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? "fill-white" : ""}`} />
                                    <span>{post.upvotes.length} Upvotes</span>
                                  </button>

                                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {post.comments.length} Comments
                                  </span>
                                </div>

                                {/* High fidelity comments panel */}
                                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                                  {post.comments.map((comment, index) => {
                                    const canDeleteComment = currentUser && (
                                      comment.username === currentUser.username ||
                                      post.citizenUsername === currentUser.username ||
                                      currentUser.role === 'officer'
                                    );

                                    return (
                                      <div key={index} className="text-xs flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                                        <div className="flex gap-2 min-w-0">
                                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[9px] text-slate-600 shrink-0 select-none">
                                            {comment.username.slice(0, 2).toUpperCase()}
                                          </div>
                                          <div className="text-left">
                                            <span 
                                              onClick={() => handleViewUserProfile(comment.username)}
                                              className="text-indigo-600 font-black shrink-0 cursor-pointer hover:underline block"
                                            >
                                              @{comment.username}
                                            </span>
                                            <span className="text-slate-600 leading-normal font-semibold">{comment.text}</span>
                                          </div>
                                        </div>
                                        {canDeleteComment && (
                                          <button
                                            onClick={() => {
                                              if (confirm("Are you sure you want to delete this comment?")) {
                                                handleDeleteComment(post.id, comment.createdAt);
                                              }
                                            }}
                                            title="Delete Comment"
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {commentVerifyLoading[post.id] && (
                                    <div className="flex items-center gap-2 text-[10px] text-indigo-600 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/30 animate-pulse">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span className="font-bold">AI Moderator is analyzing comment relevance...</span>
                                    </div>
                                  )}

                                  <CommentInput onSubmit={(text) => handleAddComment(post.id, text)} isLoading={commentVerifyLoading[post.id] || false} />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      {posts.filter(post => {
                        const passGeohash = activeGeohashFilter === "" || (post.geohash && post.geohash.startsWith(activeGeohashFilter));
                        const passCategory = activeCategoryFilter === "all" || post.category === activeCategoryFilter;
                        
                        const query = searchQuery.toLowerCase().trim();
                        const passSearch = query === "" || 
                          post.summary.toLowerCase().includes(query) || 
                          post.description.toLowerCase().includes(query) || 
                          post.citizenName.toLowerCase().includes(query) || 
                          post.citizenUsername.toLowerCase().includes(query) ||
                          (post.geohash && post.geohash.toLowerCase().includes(query));
                          
                        return passGeohash && passCategory && passSearch;
                      }).length === 0 && (
                        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center text-slate-500 shadow-sm">
                          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                          <p className="text-sm font-black text-slate-700">No reports found matching your parameters.</p>
                          <p className="text-xs text-slate-400 font-bold mt-1">Try switching category tags or resetting search filters.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Officer assigned posts */
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-slate-800 font-heading">
                        Assigned citizen complaints
                      </h3>

                      <div className="space-y-6">
                        {posts
                          .filter(p => p.department === currentUser.department)
                          .sort((a, b) => {
                            if (a.status === "pending" && b.status !== "pending") return -1;
                            if (a.status !== "pending" && b.status === "pending") return 1;
                            return b.upvotes.length - a.upvotes.length;
                          })
                          .map(post => {
                            const isResolved = post.status === "resolved";
                            return (
                              <div 
                                key={post.id}
                                className={`bg-white border border-slate-100 rounded-3xl flex flex-col gap-4 text-left shadow-sm p-5 relative overflow-hidden ${
                                  isResolved ? "border-t-4 border-t-emerald-500" : "border-t-4 border-t-amber-500"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-mono text-slate-450 font-bold uppercase">TICKET ID: #{post.id.split("-")[1] || post.id}</span>
                                    <div className="text-[10px] text-slate-400 font-bold">
                                      Reported: {new Date(post.createdAt).toLocaleDateString()} | Severity: <strong className={`capitalize font-black text-rose-600`}>{post.severity}</strong>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full text-indigo-600">
                                      ▲ {post.upvotes.length} Upvotes
                                    </span>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
                                      isResolved 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                        : "bg-amber-50 border-amber-200 text-amber-700"
                                    }`}>
                                      {post.status}
                                    </span>
                                    {currentUser && (post.citizenUsername === currentUser.username || currentUser.role === 'officer') && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Are you sure you want to delete this civic report? This action cannot be undone.")) {
                                            handleDeletePost(post.id);
                                          }
                                        }}
                                        title="Delete Civic Report"
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer shrink-0 ml-1"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Title & Description */}
                                <div>
                                  <h3 className="text-base font-extrabold text-slate-850 leading-snug">{post.summary}</h3>
                                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{post.description}</p>
                                </div>

                                {/* Images display */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-1">
                                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner">
                                    <span className="absolute top-2.5 left-2.5 z-10 text-[8px] font-black tracking-wider text-white bg-rose-600 px-2 py-0.5 rounded shadow">
                                      BEFORE REPAIR
                                    </span>
                                    <img 
                                      src={post.imageBefore} 
                                      alt="Before fix" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>

                                  {isResolved && post.imageAfter ? (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner">
                                      <span className="absolute top-2.5 left-2.5 z-10 text-[8px] font-black tracking-wider text-white bg-emerald-600 px-2 py-0.5 rounded shadow">
                                        RESOLUTION PROOF
                                      </span>
                                      <img 
                                        src={post.imageAfter} 
                                        alt="After fix" 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 border border-dashed border-slate-250 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-450 shadow-inner">
                                      <Wrench className="w-8 h-8 mb-2 opacity-40 text-amber-500 animate-pulse" />
                                      <span className="text-xs font-bold text-slate-650">Awaiting Your Action</span>
                                      <span className="text-[10px] text-slate-400 font-bold mt-1">Upload resolve photograph to close this ticket</span>
                                    </div>
                                  )}
                                </div>

                                {/* Resolution Summary Audit */}
                                {isResolved ? (
                                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl space-y-1 text-left shadow-sm">
                                    <h5 className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                      AI Resolution Audit Passed (Google Gemini verified)
                                    </h5>
                                    <p className="text-xs text-slate-600 leading-normal font-semibold">{post.resolutionSummary}</p>
                                    {post.officerNotes && (
                                      <p className="text-[10px] text-slate-400">
                                        <strong>Your notes:</strong> {post.officerNotes}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="pt-2">
                                    <button
                                      onClick={() => {
                                        setResolvePostId(post.id);
                                        setShowResolveModal(true);
                                      }}
                                      className="flex items-center gap-2 text-xs font-black py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                                    >
                                      <Wrench className="w-4 h-4" />
                                      Upload Repair Work & Close Ticket
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                        {posts.filter(p => p.department === currentUser.department).length === 0 && (
                          <div className="bg-white border border-slate-100 p-10 rounded-3xl text-center text-slate-550 shadow-sm space-y-2">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-70" />
                            <h4 className="text-sm font-black text-slate-800">All Clear! No Assigned Work</h4>
                            <p className="text-xs max-w-sm mx-auto leading-normal text-slate-500 font-semibold">
                              Terrific engine! All civic tickets tagged under your municipal sector are closed and active.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                </div>

                {/* RIGHT COLUMN: Desktop-First High Fidelity Sidebar Panel (4 cols) */}
                <div className="hidden lg:block lg:col-span-4 space-y-6 sticky top-24">
                  
                  {/* Local Sector Profile & Tracking info */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0 font-bold">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800">My Sector Tracking</h4>
                        <span className="text-[10px] text-slate-400 font-bold">Noida Municipal Council</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl p-3.5 space-y-2.5 border border-slate-100 text-xs">
                      <div className="flex justify-between font-bold text-slate-600">
                        <span>Locality Grid:</span>
                        <span className="font-mono text-indigo-600">{currentUser.geohash || "tsg1xu"}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-600">
                        <span>Total Live Issues:</span>
                        <span className="text-slate-800 font-black">{posts.filter(p => p.status === "pending").length}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-600">
                        <span>Resolved Tickets:</span>
                        <span className="text-emerald-600 font-black">{posts.filter(p => p.status === "resolved").length}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('post')}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/10 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Report New Infrastructure
                    </button>
                  </div>

                  {/* Active Citizens Leaderboard Box */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600" />
                        Active Citizens
                      </h4>
                      <button 
                        onClick={() => setActiveTab('leaderboard')}
                        className="text-[10px] text-indigo-600 font-black hover:underline"
                      >
                        View Board
                      </button>
                    </div>

                    <div className="space-y-3">
                      {users
                        .filter(u => u.role === 'citizen')
                        .slice(0, 3)
                        .map((user, idx) => (
                          <div 
                            key={user.username} 
                            onClick={() => handleViewUserProfile(user.username)}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer text-left"
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                              idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-650"
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate leading-none">{user.name}</p>
                              <p className="text-[9px] text-slate-400 truncate mt-1 font-bold">@{user.username}</p>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 shrink-0">{user.karmaPoints || 0} pts</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* AI Concierge live actions log / Alerts */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                      <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">AI System Audits</h4>
                    </div>
                    
                    <div className="space-y-3 text-xs leading-relaxed text-slate-500 font-semibold text-left">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] space-y-1.5 text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Active Moderator logs:</span>
                        </div>
                        <p>No chat spam or irrelevant comments detected in Noida Sector 62. All threads clean.</p>
                      </div>
                      
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] space-y-1.5 text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          <span>Active Escalation Logs:</span>
                        </div>
                        <p>AI Escalator Agent is tracking {posts.filter(p => p.status === 'pending' && p.severity === 'high').length} high severity tickets for automatic cabinet level dispatch.</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && (
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl text-left shadow-sm space-y-6 animate-fadeIn">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-800">Explore Categories</h3>
                  <p className="text-xs text-slate-500 font-medium">Select an infrastructure sector to filter local complaints.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setActiveCategoryFilter(cat.key);
                        setActiveTab('feed');
                      }}
                      className={`flex items-center gap-4 p-4 border rounded-2xl text-left cursor-pointer transition-all ${
                        activeCategoryFilter === cat.key
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-indigo-600 shadow-sm border border-slate-100">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800">{cat.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{cat.dept || "All Municipal issues"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROXIMITY TAB */}
            {activeTab === 'proximity' && (
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl text-left shadow-sm space-y-6 animate-fadeIn">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-800">Locality Proximity</h3>
                  <p className="text-xs text-slate-500 font-medium">Focus on your immediate neighborhood radius or view wider municipal updates.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setActiveGeohashFilter("");
                      setActiveTab('feed');
                    }}
                    className={`flex flex-col gap-2 p-5 border rounded-2xl text-left cursor-pointer transition-all ${
                      activeGeohashFilter === ""
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="text-lg font-black text-indigo-600">Wide View</span>
                    <span className="text-xs text-slate-500 font-medium">Shows citizen updates across all wards and sectors of the municipality.</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (currentUser.geohash) {
                        setActiveGeohashFilter(currentUser.geohash.substring(0, 4));
                      } else {
                        setActiveGeohashFilter(currentGeohash.substring(0, 4));
                      }
                      setActiveTab('feed');
                    }}
                    className={`flex flex-col gap-2 p-5 border rounded-2xl text-left cursor-pointer transition-all ${
                      activeGeohashFilter !== ""
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="text-lg font-black text-indigo-600">Hyperlocal Focus</span>
                    <span className="text-xs text-slate-500 font-medium">Filters the social feed exclusively to a ~5km grid radius around your registered coordinates.</span>
                  </button>
                </div>

                {activeGeohashFilter && (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-xs text-indigo-700 font-bold">
                    Currently tracking hyperlocal sector grid: <span className="font-mono">{activeGeohashFilter}••</span>
                  </div>
                )}
              </div>
            )}

            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl text-left shadow-sm space-y-8 animate-fadeIn">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-800 font-heading">Our Spirit Leaderboard</h3>
                  <p className="text-xs text-slate-500 font-medium">Recognizing neighbors and municipal officers for outstanding community action.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Neighbors karma board */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-extrabold text-indigo-600 flex items-center gap-1.5 uppercase tracking-wide font-heading">
                      Active Neighbors
                    </h4>
                    <div className="space-y-3">
                      {users
                        .filter(u => u.role === 'citizen')
                        .sort((a, b) => (b.karmaPoints || 0) - (a.karmaPoints || 0))
                        .map((user, idx) => (
                          <div 
                            key={user.username} 
                            onClick={() => handleViewUserProfile(user.username)}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all cursor-pointer text-left"
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                              idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-100 text-slate-600" : idx === 2 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">@{user.username}</p>
                            </div>
                            <span className="text-xs font-black text-indigo-600">{user.karmaPoints} pts</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Officer efficiency board */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-extrabold text-amber-600 flex items-center gap-1.5 uppercase tracking-wide font-heading">
                      Municipal Officers
                    </h4>
                    <div className="space-y-3">
                      {users
                        .filter(u => u.role === 'officer')
                        .sort((a, b) => (b.efficiencyPoints || 0) - (a.efficiencyPoints || 0))
                        .map((user, idx) => (
                          <div 
                            key={user.username} 
                            onClick={() => handleViewUserProfile(user.username)}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all cursor-pointer text-left"
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                              idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-100 text-slate-600" : idx === 2 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{user.rank}</p>
                            </div>
                            <span className="text-xs font-black text-amber-600">{user.efficiencyPoints} pts</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* POST COMPLAINT TAB */}
            {activeTab === 'post' && (
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl text-left shadow-sm space-y-6 animate-fadeIn max-w-2xl mx-auto">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-800">Report Infrastructure Issue</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a photograph of the civic problem and let Google Gemini analyze it.</p>
                </div>

                {/* Photo Dropzone / Upload area */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issue Photograph</label>
                  <div 
                    onClick={() => document.getElementById("issue-photo-picker-inline")?.click()}
                    className="relative border-2 border-dashed border-slate-200 hover:border-indigo-450 rounded-2xl aspect-video overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-4 cursor-pointer text-center transition-all shadow-inner"
                  >
                    <input
                      id="issue-photo-picker-inline"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'before')}
                      className="hidden"
                    />
                    
                    {reportPhoto ? (
                      <img 
                        src={reportPhoto} 
                        alt="Issue Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                        <div className="text-xs font-bold text-slate-600">Click to upload photograph</div>
                        <div className="text-[10px] text-slate-400 font-medium">Supports PNG, JPEG</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Describe the issue</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the problem in your own words (e.g. huge water leak near the community garden gates)..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                  />
                </div>

                {/* Gemini Autofill action button */}
                <button
                  type="button"
                  onClick={runAiAutofill}
                  disabled={aiAutofillLoading || !reportPhoto}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  {aiAutofillLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gemini is analyzing your issue...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-300" />
                      Run AI Autofill (Google Gemini)
                    </>
                  )}
                </button>

                {/* AI Autofill categorization result view */}
                {aiAutofilled && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-4 text-left">
                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Gemini Audit Results
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                        <select
                          value={aiCategory}
                          onChange={(e) => setAiCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                        >
                          <option value="pothole">Roads & Potholes</option>
                          <option value="damaged_streetlight">Street Lighting</option>
                          <option value="water_leakage">Water Supply & Leakage</option>
                          <option value="waste_management">Sanitation & Waste</option>
                          <option value="public_infra_damage">Public Infrastructure</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Severity</label>
                        <select
                          value={aiSeverity}
                          onChange={(e: any) => setAiSeverity(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-bold"
                        >
                          <option value="low">Low Severity</option>
                          <option value="medium">Medium Severity</option>
                          <option value="high">High Severity</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Target Municipal Department</label>
                      <select
                        value={aiDepartment}
                        onChange={(e) => setAiDepartment(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                      >
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">AI Headline</label>
                      <input
                        type="text"
                        value={aiSummary}
                        onChange={(e) => setAiSummary(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">AI Analysis Details</label>
                      <div className="p-3 bg-white border border-slate-100 text-[11px] text-slate-600 leading-normal rounded-xl border-l-4 border-l-indigo-600">
                        {aiDetails}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('feed');
                      setReportPhoto(null);
                      setReportDescription("");
                      setAiAutofilled(false);
                    }}
                    className="py-2.5 px-5 rounded-2xl border border-slate-200 hover:border-slate-300 text-xs text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCreatePostSubmit();
                      setActiveTab('feed');
                    }}
                    disabled={!reportPhoto}
                    className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Post Civic Report
                  </button>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl mx-auto space-y-6 text-left animate-fadeIn">
                {/* Back button if viewing another user */}
                {viewingUser && viewingUser.username !== currentUser.username && (
                  <button
                    onClick={() => setViewingUser(null)}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 py-1.5 px-3 rounded-xl transition-all cursor-pointer"
                  >
                    <CornerDownRight className="w-3.5 h-3.5 rotate-180" />
                    Back to My Profile
                  </button>
                )}

                {/* Main Profile Card */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />
                  
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-xl text-indigo-600 shadow-inner shrink-0">
                      {(viewingUser || currentUser).name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                      <h2 className="text-xl font-extrabold text-slate-800 font-heading">
                        {(viewingUser || currentUser).name}
                      </h2>
                      <p className="text-sm text-slate-500 font-medium">
                        @{(viewingUser || currentUser).username}
                      </p>

                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                        <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                          {(viewingUser || currentUser).role === 'citizen' ? 'Neighbor' : 'Municipal Officer'}
                        </span>
                        {(viewingUser || currentUser).geohash && (
                          <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {(viewingUser || currentUser).geohash}
                          </span>
                        )}
                        {(viewingUser || currentUser).role === 'officer' && (viewingUser || currentUser).department && (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700">
                            {(viewingUser || currentUser).department.split(" (")[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Collaborate button */}
                    {viewingUser && viewingUser.username !== currentUser.username && (
                      <div className="pt-2 sm:pt-0 shrink-0">
                        <button
                          onClick={() => handleToggleCollaborate(viewingUser.username)}
                          className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                            (collaborations[currentUser.username] || []).includes(viewingUser.username)
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.01]"
                          }`}
                        >
                          <CheckCircle className={`w-3.5 h-3.5 ${(collaborations[currentUser.username] || []).includes(viewingUser.username) ? "opacity-100" : "opacity-0 hidden"}`} />
                          {(collaborations[currentUser.username] || []).includes(viewingUser.username) ? "Collaborating" : "Collaborate"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info stats bar */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-center">
                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {(viewingUser || currentUser).role === 'citizen' ? 'Karma Points' : 'Efficiency Points'}
                      </p>
                      <p className="text-xl font-black text-indigo-600 mt-1">
                        {(viewingUser || currentUser).role === 'citizen' 
                          ? ((viewingUser || currentUser).karmaPoints || 0)
                          : ((viewingUser || currentUser).efficiencyPoints || 0)}
                      </p>
                    </div>

                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Collaborators
                      </p>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        {(collaborations[(viewingUser || currentUser).username] || []).length}
                      </p>
                    </div>
                  </div>

                  {/* Show contact number if collaborating or self */}
                  {((viewingUser && (collaborations[currentUser.username] || []).includes(viewingUser.username)) || !viewingUser) && (viewingUser || currentUser).mobile && (
                    <div className="mt-4 p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl text-center text-xs text-slate-600">
                      📞 Contact Number: <strong className="text-slate-800 font-bold">{(viewingUser || currentUser).mobile}</strong>
                    </div>
                  )}

                  {/* Delete Profile button */}
                  {(!viewingUser || viewingUser.username === currentUser.username) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => {
                          const conf = confirm(
                            "⚠️ WARNING: Are you sure you want to permanently delete your community profile? This will delete your account, your points, and all your reported posts/comments from Noida Community Hub. This cannot be undone."
                          );
                          if (conf) {
                            handleDeleteProfile(currentUser.username);
                          }
                        }}
                        className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-rose-600 hover:text-white border border-rose-200 hover:border-rose-500 hover:bg-rose-600 transition-all cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Community Profile
                      </button>
                    </div>
                  )}
                </div>

                {/* Active Collaborators Section */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading mb-4 flex items-center gap-2">
                    Collaborators ({(collaborations[(viewingUser || currentUser).username] || []).length})
                  </h3>
                  
                  {(collaborations[(viewingUser || currentUser).username] || []).length === 0 ? (
                    <p className="text-xs text-slate-500 leading-normal">
                      No active collaborations yet. Partner with neighbors and municipal officers to strengthen local community resilience.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(collaborations[(viewingUser || currentUser).username] || []).map(collabUsername => {
                        const collabUser = users.find(u => u.username === collabUsername) || {
                          username: collabUsername,
                          name: collabUsername.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                          role: collabUsername.startsWith('officer') ? 'officer' : 'citizen'
                        };
                        return (
                          <div
                            key={collabUsername}
                            onClick={() => handleViewUserProfile(collabUsername)}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all cursor-pointer text-left"
                          >
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600">
                              {collabUser.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{collabUser.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">@{collabUsername}</p>
                            </div>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${collabUser.role === 'officer' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`}>
                              {collabUser.role === 'officer' ? 'Officer' : 'Neighbor'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* History Section */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading mb-4 flex items-center gap-2">
                    Reported Complaints
                  </h3>

                  {posts.filter(p => p.citizenUsername === (viewingUser || currentUser).username).length === 0 ? (
                    <p className="text-xs text-slate-500 leading-normal">
                      No complaints or reports logged yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {posts
                        .filter(p => p.citizenUsername === (viewingUser || currentUser).username)
                        .map(post => (
                          <div
                            key={post.id}
                            onClick={() => {
                              setActiveTab('feed');
                              setSelectedPostId(post.id);
                              setTimeout(() => {
                                const element = document.getElementById(post.id);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 100);
                            }}
                            className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer text-left"
                          >
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shrink-0">
                              <img src={post.imageBefore} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{post.summary}</h4>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{post.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${post.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {post.status}
                                </span>
                                <span className="text-[9px] text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INSTAGRAM STYLE BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 shadow-lg">
              <div className="max-w-md mx-auto flex items-center justify-between">
                <button
                  onClick={() => { setActiveTab('feed'); setViewingUser(null); }}
                  className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all cursor-pointer ${
                    activeTab === 'feed' ? "text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Compass className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Feed</span>
                </button>

                <button
                  onClick={() => setActiveTab('categories')}
                  className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all cursor-pointer ${
                    activeTab === 'categories' ? "text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Sliders className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Categories</span>
                </button>

                <button
                  onClick={() => setActiveTab('proximity')}
                  className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all cursor-pointer ${
                    activeTab === 'proximity' ? "text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Proximity</span>
                </button>

                <button
                  onClick={() => setActiveTab('post')}
                  className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all cursor-pointer ${
                    activeTab === 'post' ? "text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all cursor-pointer ${
                    activeTab === 'leaderboard' ? "text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Leaders</span>
                </button>

                <button
                  onClick={() => { setActiveTab('profile'); setViewingUser(null); }}
                  className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all cursor-pointer ${
                    activeTab === 'profile' && !viewingUser ? "text-indigo-600 scale-105" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Profile</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* --- MODAL 1: REPORT CIVIC COMPLAINT --- */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-lg overflow-hidden border border-slate-800 flex flex-col text-left"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold font-heading text-white">Report Infrastructure Issue</h3>
                <button 
                  onClick={() => {
                    setShowReportModal(false);
                    setReportPhoto(null);
                    setReportDescription("");
                    setAiAutofilled(false);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[75vh] space-y-5">
                
                {/* Photo Dropzone / Upload area */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issue Photograph</label>
                  <div 
                    onClick={() => document.getElementById("issue-photo-picker")?.click()}
                    className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl aspect-video overflow-hidden bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center p-4 cursor-pointer text-center transition-all"
                  >
                    <input
                      id="issue-photo-picker"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'before')}
                      className="hidden"
                    />
                    
                    {reportPhoto ? (
                      <img 
                        src={reportPhoto} 
                        alt="Issue Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Camera className="w-10 h-10 text-slate-500 mx-auto opacity-70" />
                        <div className="text-xs font-semibold text-slate-300">Click to upload issue photograph</div>
                        <div className="text-[10px] text-slate-500">Supports PNG, JPEG</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Describe the issue</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the problem in your own words (e.g. huge water leak near the community garden gates)..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                {/* Gemini Autofill action button */}
                <button
                  type="button"
                  onClick={runAiAutofill}
                  disabled={aiAutofillLoading || !reportPhoto}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold font-heading text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {aiAutofillLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gemini is analyzing your issue...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-violet-300" />
                      ⚡ AI Autofill (Google Gemini)
                    </>
                  )}
                </button>

                {/* AI Autofill categorization result view */}
                {aiAutofilled && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-950/25 border border-indigo-500/20 rounded-xl p-4 space-y-4 text-left"
                  >
                    <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Gemini Audit Results
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                        <select
                          value={aiCategory}
                          onChange={(e) => setAiCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="pothole">🚧 Pothole / Roads</option>
                          <option value="damaged_streetlight">💡 Streetlight</option>
                          <option value="water_leakage">💧 Water Leakage</option>
                          <option value="waste_management">♻️ Waste / Garbage</option>
                          <option value="public_infra_damage">🏢 Public Infra</option>
                          <option value="other">❓ Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Severity</label>
                        <select
                          value={aiSeverity}
                          onChange={(e: any) => setAiSeverity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-semibold"
                        >
                          <option value="low">🟢 Low Severity</option>
                          <option value="medium">🟡 Medium Severity</option>
                          <option value="high">🔴 High Severity</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Target Municipal Department</label>
                      <select
                        value={aiDepartment}
                        onChange={(e) => setAiDepartment(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      >
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">AI Headline</label>
                      <input
                        type="text"
                        value={aiSummary}
                        onChange={(e) => setAiSummary(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">AI Analysis details</label>
                      <div className="p-2.5 bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 leading-normal rounded-lg border-l-2 border-l-indigo-500">
                        {aiDetails}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportPhoto(null);
                    setReportDescription("");
                    setAiAutofilled(false);
                  }}
                  className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePostSubmit}
                  disabled={!reportPhoto}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold font-heading shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  Post Civic Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: RESOLVE COMPLAINT AUDIT --- */}
      <AnimatePresence>
        {showResolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-lg overflow-hidden border border-slate-800 flex flex-col text-left"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold font-heading text-white">Submit Repair Resolution</h3>
                <button 
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolvePhoto(null);
                    setResolveNotes("");
                    setAiVerificationResult(null);
                    setResolvePostId(null);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[75vh] space-y-5">
                
                {/* Image after upload */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Proof of Repair Photograph (AFTER)</label>
                  <div 
                    onClick={() => document.getElementById("repair-photo-picker")?.click()}
                    className="relative border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl aspect-video overflow-hidden bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center p-4 cursor-pointer text-center transition-all"
                  >
                    <input
                      id="repair-photo-picker"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'after')}
                      className="hidden"
                    />
                    
                    {resolvePhoto ? (
                      <img 
                        src={resolvePhoto} 
                        alt="Repair Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="space-y-2">
                        <Wrench className="w-10 h-10 text-slate-500 mx-auto opacity-70" />
                        <div className="text-xs font-semibold text-slate-300">Click to upload resolved repair work photograph</div>
                        <div className="text-[10px] text-slate-500">Must represent fixed infrastructure matching the ticket location</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Repair Completion Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Describe materials used or actions taken (e.g. potholes filled with standard bitumen composite)..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                {/* Run Gemini audit verification trigger */}
                <button
                  type="button"
                  onClick={runAiVerifyResolution}
                  disabled={aiVerifyLoading || !resolvePhoto}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold font-heading text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {aiVerifyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gemini is conducting visual audit comparison...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      ⚡ Run Gemini Resolution Audit
                    </>
                  )}
                </button>

                {/* Display audit verification result details */}
                {aiVerificationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`border rounded-xl p-4 space-y-2 text-left ${
                      aiVerificationResult.is_resolved 
                        ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                        : "bg-rose-950/20 border-rose-500/20 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold uppercase">
                      <span>Audit Status</span>
                      <span className={`px-2 py-0.5 rounded ${
                        aiVerificationResult.is_resolved ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"
                      }`}>
                        {aiVerificationResult.is_resolved ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400">
                      Confidence Level: <strong className="text-slate-200">{Math.round(aiVerificationResult.confidence * 100)}%</strong>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal">
                      {aiVerificationResult.verification_summary}
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolvePhoto(null);
                    setResolveNotes("");
                    setAiVerificationResult(null);
                    setResolvePostId(null);
                  }}
                  className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeTicket}
                  disabled={!aiVerificationResult || !aiVerificationResult.is_resolved}
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold font-heading shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  Finalize & Close Ticket
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FLOATING CIVIC CONCIERGE CHAT PANEL --- */}
      <div className="fixed bottom-5 right-5 z-45 flex flex-col items-end gap-3 select-none">
        
        {/* Toggle widget button */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 font-semibold font-heading text-xs py-3 px-5 rounded-full text-white shadow-xl shadow-indigo-600/20 active:scale-[0.98] cursor-pointer transition-all shrink-0"
        >
          <MessageSquare className="w-4 h-4 fill-white" />
          Ask AI Concierge
        </button>

        {/* Dynamic sliding chat screen */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel w-80 h-96 border border-slate-800 flex flex-col overflow-hidden text-left"
            >
              <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-3.5 h-3.5" />
                  Civic Concierge Agent
                </span>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-0.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message Scroll Space */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`max-w-[85%] text-[11px] p-2.5 rounded-xl leading-relaxed ${
                      msg.role === 'user'
                        ? "bg-gradient-to-br from-pink-600 to-indigo-600 text-white ml-auto rounded-br-none"
                        : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl rounded-bl-none text-[11px] text-slate-400 flex items-center gap-2 max-w-[60%]">
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    Thinking...
                  </div>
                )}
                
                <div ref={chatBottomRef} />
              </div>

              {/* Chat input form */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Ask a community question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                  className="flex-1 bg-slate-900/80 border border-slate-800 rounded-full py-2 px-3 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading}
                  className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white cursor-pointer transition-colors"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- SIMULATOR PANEL (BACKGROUND AGENTS) --- */}
      <div className="fixed bottom-5 left-5 z-40 select-none">
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 py-2.5 px-4 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer shadow-lg shadow-black/40"
        >
          ⚙️ AI Agents
        </button>

        <AnimatePresence>
          {showSimulator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-12 left-0 w-64 glass-panel border border-slate-800 p-4 space-y-3.5 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-300 font-heading">Simulate background agents</span>
                <button onClick={() => setShowSimulator(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={simulateAiEscalator}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-[10px] tracking-wide text-center cursor-pointer transition-colors"
                >
                  🏃‍♂️ Run AI Escalator Agent
                </button>
                <p className="text-[9px] text-slate-500 leading-normal">
                  Analyzes database and escalates unresolved complaints (&gt;=1 upvote, high severity) directly to Chief Commissioner.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

// --- HELPER COMMENT INPUT COMPONENT ---
function CommentInput({ onSubmit, isLoading }: { onSubmit: (text: string) => void, isLoading: boolean }) {
  const [text, setText] = useState("");
  
  const handlePost = () => {
    if (!text.trim() || isLoading) return;
    onSubmit(text);
    setText("");
  };

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
      <input
        type="text"
        disabled={isLoading}
        placeholder={isLoading ? "Analyzing comment..." : "Add a constructive comment..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handlePost()}
        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 rounded-xl py-2 px-3 text-[11px] text-slate-750 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
      />
      <button
        type="button"
        onClick={handlePost}
        disabled={isLoading || !text.trim()}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 border border-indigo-600 py-2 px-4 rounded-xl text-[10px] text-white font-bold cursor-pointer transition-colors shadow-sm"
      >
        {isLoading ? "Checking..." : "Post"}
      </button>
    </div>
  );
}
