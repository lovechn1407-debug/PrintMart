"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  FileText,
  CreditCard,
  HelpCircle,
  PhoneCall,
  Mail,
  ChevronRight,
  ChevronDown,
  Camera,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  AlertCircle,
  UploadCloud,
  Send,
  ExternalLink,
  Receipt,
  Sparkles,
  RefreshCw,
  Lock,
  X,
  FileQuestion,
  MessageSquare,
  LifeBuoy,
  FileWarning,
  BadgeAlert,
  Edit2,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { AppNavbar } from "@/components/AppNavbar";
import { auth, database, ref, get, set, onValue, update } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { PrintJob } from "@printmart/shared";

function formatRupees(paise: number = 0): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

// ── TYPES ──
type ActiveSection = "all" | "profile" | "policies" | "transactions" | "faq" | "tickets" | "contact";

interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  jobId?: string;
  otp?: string;
  description: string;
  imageUrl?: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  createdAt: number;
}

const COMMON_PROBLEMS = [
  "Page not printed",
  "Incomplete Pages",
  "Faded ink on page",
  "Paper jam in kiosk",
  "Kiosk stuck on OTP screen",
  "Payment deducted but OTP not received",
  "Wrong page orientation/format",
  "Other issue",
];

const POLICIES = [
  {
    id: "terms",
    title: "Terms and Conditions",
    badge: "Usage Agreement",
    summary: "Rules and terms governing campus self-service cloud-to-kiosk printing at PrintMart.",
    content: [
      {
        heading: "1. Campus Platform Overview",
        text: "PrintMart provides automated, cloud-connected self-service printing kiosks across college and university campuses. By using the PrintMart web application, uploading files, or redeeming universal OTP codes at any campus kiosk, you agree to comply with these terms.",
      },
      {
        heading: "2. Universal OTP System",
        text: "Upon successful payment, PrintMart generates a unique 6-digit Universal One-Time Password (OTP). This universal OTP is valid at ANY operational PrintMart kiosk on campus for a duration of 24 hours. The code is single-use and automatically expires once the document spooling is completed or after 24 hours.",
      },
      {
        heading: "3. Document Storage & Cloud Vault",
        text: "Uploaded documents are temporarily stored in an encrypted cloud vault solely for printing purposes. In accordance with campus data privacy protocols, all uploaded files are permanently deleted automatically after 7 days (Time-To-Live). Users must retain original copies of their documents.",
      },
      {
        heading: "4. Prohibited Content & Academic Integrity",
        text: "Users are strictly prohibited from printing unauthorized examination question papers, leaked internal university documents, counterfeit certificates, copyrighted textbooks without fair-use clearance, or illicit/offensive materials. PrintMart reserves the right to suspend accounts violating campus regulations.",
      },
      {
        heading: "5. Hardware Safety & Kiosk Etiquette",
        text: "Users must not pull or force paper trays, disconnect power cables, or tamper with kiosk touchscreens and printer assemblies. Any observed hardware issues must be reported through the Help & Support tab.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    badge: "Data Protection",
    summary: "How your personal information and uploaded files are protected with zero-logging encryption.",
    content: [
      {
        heading: "1. Zero-Log Document Security",
        text: "We respect your academic privacy. PrintMart never indexes, reads, shares, or permanently stores the text or imagery inside your uploaded documents. Files are spooled directly to the hardware printer in memory and purged upon job completion.",
      },
      {
        heading: "2. Automatic 7-Day Purge",
        text: "Files in our cloud vault are cryptographically tied to your user ID and are hard-deleted automatically 7 days after upload, leaving no historical trace on storage servers.",
      },
      {
        heading: "3. Personal Information Collected",
        text: "We collect only your Name, Email Address, and Google Profile Picture via Google OAuth to provide order history tracking, support ticket updates, and payment receipts.",
      },
      {
        heading: "4. Payment Information",
        text: "All payment transactions are encrypted and processed by Razorpay in compliance with PCI-DSS Level 1 standards. PrintMart never stores or has access to your UPI PINs, credit/debit card numbers, or banking credentials.",
      },
    ],
  },
  {
    id: "refund",
    title: "Refund Policy",
    badge: "100% Fairness Guarantee",
    summary: "Clear guidelines on automated and support-assisted refunds for failed or defective prints.",
    content: [
      {
        heading: "1. Campus Fairness Guarantee",
        text: "If your printing job fails due to kiosk hardware or software failure, you are entitled to a full refund or an instant replacement reprint credit.",
      },
      {
        heading: "2. Eligible Refund Conditions",
        text: "Refunds are promptly approved in the following cases: (a) Printer ran out of paper or experienced a paper jam mid-job; (b) Ink toner faded, resulting in unreadable text; (c) Kiosk power outage or network loss during printing; (d) Payment deducted from bank but universal OTP was not generated or expired unconsumed.",
      },
      {
        heading: "3. Ineligible Scenarios",
        text: "Refunds cannot be granted for user-side errors such as uploading a blank or corrupt file, selecting the wrong page numbers, choosing Black & White instead of Color by mistake, or changing your mind after paper has been printed.",
      },
      {
        heading: "4. Resolution & Refund Timeline",
        text: "Refund requests submitted through Help & Support are reviewed within campus hours. Once verified, refunds are credited back to your original source UPI account or bank within 2 to 3 business days.",
      },
    ],
  },
  {
    id: "return",
    title: "Return Policy",
    badge: "Custom Physical Goods",
    summary: "Policy regarding customized physical printouts and replacement procedures.",
    content: [
      {
        heading: "1. Custom Printed Physical Items",
        text: "Because printed documents are customized physical items manufactured on-demand with your personalized content, successfully printed sheets cannot be physically returned or resold.",
      },
      {
        heading: "2. Defective Print Replacement",
        text: "If physical prints emerge with roller oil marks, torn corners, ink streaks, or misalignment caused by printer rollers, simply take a photo of the printed sheet and upload it in the Help & Support tab within 2 hours of collection for an instant reprint token.",
      },
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    badge: "Legal Notice",
    summary: "Service availability, document preview fidelity, and limitation of liabilities.",
    content: [
      {
        heading: "1. Kiosk Availability & Campus Uptime",
        text: "While PrintMart strives for 99.9% kiosk availability across campus, service may occasionally be disrupted due to campus building power maintenance, campus Wi-Fi outages, or scheduled maintenance.",
      },
      {
        heading: "2. Margin & Resolution Preview Fidelity",
        text: "The Print Studio preview renders documents as closely as possible to standard A4 specifications. Users are responsible for ensuring that critical text or graphics are within standard 0.5-inch printable margins.",
      },
      {
        heading: "3. Academic Deadlines",
        text: "PrintMart is not liable for academic penalties, missed class assignments, or submission delays resulting from last-minute kiosk queue delays. We strongly recommend printing assignments at least 30 minutes before submission deadlines.",
      },
    ],
  },
];

const FAQS = [
  {
    q: "How does the Universal OTP work at the campus kiosk?",
    a: "Your 6-digit OTP is universal across all PrintMart kiosks on campus! You do not need to choose a machine in advance. Simply walk up to any available kiosk, tap 'Enter OTP', type your 6-digit code, and your documents will immediately spool and print.",
  },
  {
    q: "What if the kiosk runs out of paper while printing my document?",
    a: "Don't panic! The kiosk detects the paper outage and securely pauses. Go to the 'Help & Support' section below and raise a ticket with category 'Incomplete Pages' or 'Page not printed'. We will verify the spool count and issue an instant reprint code or full refund within minutes.",
  },
  {
    q: "How long is my Universal OTP valid?",
    a: "Every OTP is valid for 24 hours from the exact moment of payment confirmation. If you don't use it within 24 hours, you can request an automatic refund through Help & Support.",
  },
  {
    q: "Can I print directly from my phone without downloading an app?",
    a: "Yes! PrintMart is 100% web-based. Simply open itsprintmart.vercel.app on your phone browser (Safari, Chrome, etc.), upload your PDF or image, pay via UPI, and receive your universal code instantly.",
  },
  {
    q: "How long are my uploaded files stored in the cloud?",
    a: "All uploaded documents are stored in an encrypted vault with an automated 7-day Time-To-Live (TTL). Once 7 days elapse, files are permanently deleted. No human ever inspects your documents.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support all Indian payment options: UPI (Google Pay, PhonePe, Paytm, CRED, BHIM), Credit/Debit Cards (Visa, MasterCard, RuPay), and NetBanking via Razorpay.",
  },
  {
    q: "Can I print in color or double-sided?",
    a: "In the Print Studio, you can switch between Black & White (₹1.50/page) and full Color prints. Currently, kiosks support single-side prints on premium 70 GSM paper.",
  },
  {
    q: "What file formats can I print?",
    a: "We support PDF (.pdf), Microsoft Word (.docx), PowerPoint (.pptx), and high-resolution images (.jpg, .jpeg, .png, .webp).",
  },
];

export default function MorePage() {
  const { user, profile, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  // Active sub-section filter pill
  const [activeSection, setActiveSection] = useState<ActiveSection>("all");

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<PrintJob[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<PrintJob | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Legal & Policy Viewer State
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("terms");

  // Help & Support Ticket State
  const [ticketCategory, setTicketCategory] = useState<string>("Page not printed");
  const [ticketOtp, setTicketOtp] = useState<string>("");
  const [ticketDesc, setTicketDesc] = useState<string>("");
  const [ticketImageFile, setTicketImageFile] = useState<File | null>(null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null);
  const [ticketSubmitting, setTicketSubmitting] = useState<boolean>(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Name when profile loads
  useEffect(() => {
    if (profile?.displayName || user?.displayName) {
      setNewName(profile?.displayName || user?.displayName || "");
    }
  }, [profile?.displayName, user?.displayName]);

  // Load Transactions from Realtime DB
  useEffect(() => {
    if (!user) {
      setTxLoading(false);
      return;
    }

    const jobsRef = ref(database, "printJobs");
    const unsub = onValue(jobsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allJobs = Object.values(snapshot.val()) as PrintJob[];
        const userTxs = allJobs
          .filter((j) => j.userId === user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setTransactions(userTxs);
      } else {
        setTransactions([]);
      }
      setTxLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Load User's Support Tickets
  useEffect(() => {
    if (!user) return;
    const ticketsRef = ref(database, "supportTickets");
    const unsub = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allTickets = Object.values(snapshot.val()) as SupportTicket[];
        const mine = allTickets
          .filter((t) => t.userId === user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setUserTickets(mine);
      } else {
        setUserTickets([]);
      }
    });

    return () => unsub();
  }, [user]);

  // Handle Save Display Name
  const handleSaveName = async () => {
    if (!newName.trim() || !auth.currentUser) return;
    setProfileSaving(true);
    setProfileSuccessMsg(null);
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      await update(userRef, { displayName: newName.trim() });
      setIsEditingName(false);
      setProfileSuccessMsg("Profile name updated successfully!");
      setTimeout(() => setProfileSuccessMsg(null), 3000);
    } catch (err: any) {
      alert("Failed to update name: " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !auth.currentUser) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      alert("Please select a profile photo smaller than 5MB");
      return;
    }

    setProfileSaving(true);
    try {
      // Direct base64 or upload to vault
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        try {
          await updateProfile(auth.currentUser!, { photoURL: base64Url });
          const userRef = ref(database, `users/${auth.currentUser!.uid}`);
          await update(userRef, { photoURL: base64Url });
          setProfileSuccessMsg("Profile photo updated successfully!");
          setTimeout(() => setProfileSuccessMsg(null), 3000);
        } catch (err: any) {
          console.error("Error setting photo:", err);
        } finally {
          setProfileSaving(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setProfileSaving(false);
      alert("Photo update error: " + err.message);
    }
  };

  // Handle Ticket Image Attachment
  const handleTicketImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.size > 8 * 1024 * 1024) {
      alert("Proof image must be under 8MB");
      return;
    }
    setTicketImageFile(file);
    const url = URL.createObjectURL(file);
    setTicketImagePreview(url);
  };

  // Handle Support Ticket Submit
  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim()) {
      setTicketError("Please describe the problem you experienced.");
      return;
    }

    setTicketSubmitting(true);
    setTicketError(null);

    try {
      let uploadedImageUrl = "";
      if (ticketImageFile) {
        // Upload image to backend vault or read as data URL
        const reader = new FileReader();
        uploadedImageUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(ticketImageFile);
        });
      }

      const ticketId = `PM-TKT-${Date.now().toString().slice(-5)}`;
      const newTicket: SupportTicket = {
        ticketId,
        userId: user?.uid || "anonymous",
        userName: profile?.displayName || user?.displayName || "Campus Customer",
        userEmail: user?.email || "anonymous@printmart.com",
        category: ticketCategory,
        otp: ticketOtp.trim() || undefined,
        description: ticketDesc.trim(),
        imageUrl: uploadedImageUrl || undefined,
        status: "OPEN",
        createdAt: Date.now(),
      };

      await set(ref(database, `supportTickets/${ticketId}`), newTicket);

      setSubmittedTicketId(ticketId);
      setTicketDesc("");
      setTicketOtp("");
      setTicketImageFile(null);
      setTicketImagePreview(null);
    } catch (err: any) {
      setTicketError("Failed to submit ticket: " + (err.message || "Network error"));
    } finally {
      setTicketSubmitting(false);
    }
  };

  const activePolicy = useMemo(
    () => POLICIES.find((p) => p.id === selectedPolicyId) || POLICIES[0],
    [selectedPolicyId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f3] text-neutral-900 pb-24 sm:pb-12">
      <AppNavbar />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col gap-1.5 border-b border-neutral-200/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Account & Info
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1c1c1c] tracking-tight">
            More Options
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Manage your profile, view transactions, read policies, raise support tickets, and get campus help.
          </p>
        </div>

        {/* Quick Filter Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: "Overview" },
            { id: "profile", label: "Profile" },
            { id: "transactions", label: "My Transactions" },
            { id: "tickets", label: "Help & Tickets" },
            { id: "policies", label: "Legal & Policies" },
            { id: "faq", label: "FAQ" },
            { id: "contact", label: "Contact Us" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as ActiveSection)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSection === tab.id
                  ? "bg-[#0c831f] text-white shadow-xs scale-102"
                  : "bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECTION A: PROFILE CARD
            ───────────────────────────────────────────────────────────── */}
        {(activeSection === "all" || activeSection === "profile") && (
          <div
            id="profile"
            className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1c1c1c]">Profile Card</h2>
                  <p className="text-[11px] text-neutral-400">Personalize your student printing account</p>
                </div>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
                >
                  Sign Out
                </button>
              )}
            </div>

            {user ? (
              <div className="space-y-4">
                {profileSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                  {/* Avatar with Change Overlay */}
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-900 text-white flex items-center justify-center text-2xl font-black shadow-md overflow-hidden border-2 border-white ring-2 ring-emerald-500/20">
                      {profile?.photoURL || user.photoURL ? (
                        <img
                          src={profile?.photoURL || user.photoURL}
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {(profile?.displayName || user.displayName || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={profileSaving}
                      title="Change Profile Photo"
                      className="absolute inset-0 bg-black/50 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span>Change</span>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Profile Details & Inline Name Editor */}
                  <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">
                        Full Name
                      </label>
                      {isEditingName ? (
                        <div className="flex items-center gap-2 mt-1 max-w-sm mx-auto sm:mx-0">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter your name"
                            className="flex-1 h-9 px-3 text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0c831f]"
                          />
                          <button
                            type="button"
                            onClick={handleSaveName}
                            disabled={profileSaving}
                            className="h-9 px-3 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                          >
                            {profileSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingName(false);
                              setNewName(profile?.displayName || user.displayName || "");
                            }}
                            className="h-9 px-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                          <span className="text-base font-black text-[#1c1c1c]">
                            {profile?.displayName || user.displayName || "PrintMart Customer"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingName(true)}
                            title="Edit Name"
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">
                        Email Address
                      </label>
                      <p className="text-xs font-semibold text-neutral-700 mt-0.5">{user.email}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1 max-w-sm mx-auto sm:mx-0">
                      <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 text-center">
                        <span className="text-[10px] font-semibold text-neutral-500 block">Orders</span>
                        <span className="text-sm font-black text-neutral-900">
                          {transactions.length}
                        </span>
                      </div>
                      <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 text-center">
                        <span className="text-[10px] font-semibold text-neutral-500 block">Pages</span>
                        <span className="text-sm font-black text-neutral-900">
                          {profile?.stats?.totalPages || transactions.reduce((sum, t) => sum + (t.configuration?.totalPagesToPrint || (t as any).pageCount || 1), 0)}
                        </span>
                      </div>
                      <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 text-center">
                        <span className="text-[10px] font-semibold text-neutral-500 block">Status</span>
                        <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Signed Out State */
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center mx-auto">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Guest User</h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-0.5">
                    Sign in with Google to customize your profile, view orders, and track support tickets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="h-10 px-5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SECTION B: MY TRANSACTIONS
            ───────────────────────────────────────────────────────────── */}
        {(activeSection === "all" || activeSection === "transactions") && (
          <div
            id="transactions"
            className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1c1c1c]">My Transactions</h2>
                  <p className="text-[11px] text-neutral-400">Past payments, UPI receipts, and order billing</p>
                </div>
              </div>
              <Link
                href="/user/history"
                className="text-xs font-bold text-[#0c831f] hover:underline flex items-center gap-1"
              >
                <span>View Jobs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {txLoading ? (
              <div className="py-8 text-center text-xs text-neutral-400">Loading transactions...</div>
            ) : !user ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                Please sign in to view your transaction receipts.
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <Receipt className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs text-neutral-500">No print transactions yet.</p>
                <Link
                  href="/user/print"
                  className="inline-block mt-1 text-xs font-bold text-[#0c831f] hover:underline"
                >
                  Start your first print job →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.jobId}
                    className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/60 hover:bg-neutral-50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {tx.documentName || "Document.pdf"}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          PAID
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                        <span>
                          {new Date(tx.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span>OTP: {tx.otp || (tx as any).otpCode || "------"}</span>
                        <span>•</span>
                        <span>{tx.configuration?.totalPagesToPrint || (tx as any).pageCount || 1} pages</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-sm font-black text-neutral-900">
                        {formatRupees(tx.pricing?.finalPayablePaise || (tx.payment as any)?.amountPaise || 150)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="text-[11px] font-bold text-[#0c831f] hover:underline"
                      >
                        View Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SECTION E: HELP & SUPPORT (RAISE TICKETS)
            ───────────────────────────────────────────────────────────── */}
        {(activeSection === "all" || activeSection === "tickets") && (
          <div
            id="tickets"
            className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-5"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1c1c1c]">Help & Support (Raise Ticket)</h2>
                  <p className="text-[11px] text-neutral-400">
                    Instant campus ticket resolution for paper jams, faded ink, and unprinted pages
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                Avg. response 15m
              </span>
            </div>

            {submittedTicketId && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-extrabold text-sm">Ticket Raised Successfully!</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Your Ticket ID is <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300">{submittedTicketId}</strong>.
                  Our campus maintenance team will review your proof and credit a replacement token or process a refund within 15 minutes.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmittedTicketId(null)}
                  className="text-xs font-bold text-emerald-700 underline"
                >
                  Raise another ticket
                </button>
              </div>
            )}

            <form onSubmit={handleRaiseTicket} className="space-y-4">
              {ticketError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{ticketError}</span>
                </div>
              )}

              {/* Problem Selection Chips */}
              <div>
                <label className="text-xs font-extrabold uppercase text-neutral-600 tracking-wider block mb-2">
                  Select Common Issue
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_PROBLEMS.map((prob) => (
                    <button
                      key={prob}
                      type="button"
                      onClick={() => setTicketCategory(prob)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        ticketCategory === prob
                          ? "bg-[#0c831f] text-white shadow-xs font-bold"
                          : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      {prob}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional OTP / Job Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block mb-1">
                    Universal OTP (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={ticketOtp}
                    onChange={(e) => setTicketOtp(e.target.value.toUpperCase())}
                    placeholder="e.g. 748291"
                    className="w-full h-10 px-3 text-xs font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c831f]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block mb-1">
                    Kiosk Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Library 1st Floor / Canteen Kiosk"
                    className="w-full h-10 px-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c831f]"
                  />
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1">
                  Describe what happened <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Explain the issue (e.g. Machine stopped after printing 2 out of 5 pages, paper jammed in tray, ink was very faded)..."
                  className="w-full p-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0c831f]"
                />
              </div>

              {/* Image Uploading for Proof */}
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">
                  Upload Photo Proof (Optional, highly recommended for fast refunds)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => ticketFileInputRef.current?.click()}
                    className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-neutral-200"
                  >
                    <Camera className="w-4 h-4 text-neutral-600" />
                    <span>{ticketImageFile ? "Change Photo" : "Attach Photo"}</span>
                  </button>
                  <input
                    ref={ticketFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleTicketImageSelect}
                    className="hidden"
                  />
                  {ticketImageFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 truncate max-w-[150px]">
                        {ticketImageFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTicketImageFile(null);
                          setTicketImagePreview(null);
                        }}
                        className="text-neutral-400 hover:text-rose-600 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {ticketImagePreview && (
                  <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 shadow-2xs">
                    <img
                      src={ticketImagePreview}
                      alt="Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={ticketSubmitting}
                className="w-full h-11 bg-[#0c831f] hover:bg-[#0a6e1a] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {ticketSubmitting ? (
                  <span>Submitting Ticket...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Support Ticket</span>
                  </>
                )}
              </button>
            </form>

            {/* Previously Raised Tickets List */}
            {userTickets.length > 0 && (
              <div className="pt-4 border-t border-neutral-100 space-y-2">
                <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider">
                  My Active Tickets
                </h3>
                <div className="space-y-2">
                  {userTickets.map((t) => (
                    <div
                      key={t.ticketId}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-800">{t.ticketId}</span>
                          <span className="font-semibold text-neutral-600">• {t.category}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">{t.description}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : t.status === "IN_REVIEW"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SECTION C: LEGAL AND POLICIES
            ───────────────────────────────────────────────────────────── */}
        {(activeSection === "all" || activeSection === "policies") && (
          <div
            id="policies"
            className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1c1c1c]">Legal & Policies</h2>
                  <p className="text-[11px] text-neutral-400">
                    Comprehensive operational terms, privacy safeguards, and refund policy
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Tab Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {POLICIES.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setSelectedPolicyId(policy.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedPolicyId === policy.id
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {policy.title}
                </button>
              ))}
            </div>

            {/* Active Policy Content Card */}
            <div className="p-4 sm:p-5 bg-neutral-50/70 rounded-2xl border border-neutral-200/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[#1c1c1c] tracking-tight">
                  {activePolicy.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                  {activePolicy.badge}
                </span>
              </div>
              <p className="text-xs text-neutral-500 italic">{activePolicy.summary}</p>

              <div className="space-y-3 pt-2 border-t border-neutral-200/50">
                {activePolicy.content.map((sec, idx) => (
                  <div key={idx} className="space-y-1">
                    <h4 className="text-xs font-bold text-neutral-900">{sec.heading}</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">{sec.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SECTION D: FAQ
            ───────────────────────────────────────────────────────────── */}
        {(activeSection === "all" || activeSection === "faq") && (
          <div
            id="faq"
            className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1c1c1c]">Frequently Asked Questions</h2>
                  <p className="text-[11px] text-neutral-400">Everything you need to know about campus kiosk printing</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {FAQS.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-neutral-100 bg-neutral-50/60 overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-xs sm:text-[13px] font-bold text-[#1c1c1c]">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-[#0c831f]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100/60 pt-2 animate-in fade-in duration-150">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SECTION F: CONTACT SUPPORT
            ───────────────────────────────────────────────────────────── */}
        {(activeSection === "all" || activeSection === "contact") && (
          <div
            id="contact"
            className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#1c1c1c]">Contact Campus Support</h2>
                  <p className="text-[11px] text-neutral-400">Reach our dedicated support team across channels</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                8:00 AM – 11:00 PM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Mail Card */}
              <a
                href="mailto:lovechn1407@gmail.com?subject=PrintMart%20Support%20Request"
                className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/70 hover:bg-white hover:border-[#0c831f] transition-all flex flex-col justify-between gap-3 group active:scale-98"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Email Support
                  </span>
                  <span className="text-xs font-bold text-[#1c1c1c] block truncate mt-0.5">
                    lovechn1407@gmail.com
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0c831f] group-hover:underline flex items-center gap-1">
                  <span>Send Email</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              {/* Phone Card */}
              <a
                href="tel:8383090874"
                className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/70 hover:bg-white hover:border-[#0c831f] transition-all flex flex-col justify-between gap-3 group active:scale-98"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Phone / Call
                  </span>
                  <span className="text-xs font-bold text-[#1c1c1c] block truncate mt-0.5">
                    8383090874
                  </span>
                </div>
                <span className="text-[11px] font-bold text-sky-700 group-hover:underline flex items-center gap-1">
                  <span>Call Now</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              {/* Instagram Card */}
              <a
                href="https://instagram.com/love_chn.14"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/70 hover:bg-white hover:border-pink-500 transition-all flex flex-col justify-between gap-3 group active:scale-98"
              >
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <InstagramIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Instagram Direct
                  </span>
                  <span className="text-xs font-bold text-[#1c1c1c] block truncate mt-0.5">
                    love_chn.14
                  </span>
                </div>
                <span className="text-[11px] font-bold text-pink-700 group-hover:underline flex items-center gap-1">
                  <span>Follow & DM</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>

            {/* Quick WhatsApp Action Strip */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs text-emerald-900 font-semibold">
                  Need quick assistance at the kiosk? Chat directly on WhatsApp.
                </span>
              </div>
              <a
                href="https://wa.me/918383090874?text=Hi%20PrintMart%20Support,%20I%20need%20help%20with%20my%20print"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold rounded-lg shrink-0 shadow-xs active:scale-95 transition-all"
              >
                WhatsApp Chat
              </a>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          ITEMIZED RECEIPT MODAL
          ───────────────────────────────────────────────────────────── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-neutral-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0c831f]" />
                <span className="font-extrabold text-sm text-neutral-900">Payment Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Document</span>
                <span className="font-bold text-neutral-900 truncate max-w-[180px]">
                  {selectedTx.documentName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Universal OTP</span>
                <span className="font-mono font-bold text-neutral-900">{selectedTx.otp || (selectedTx as any).otpCode || "------"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Total Pages</span>
                <span className="font-bold text-neutral-900">{selectedTx.configuration?.totalPagesToPrint || (selectedTx as any).pageCount || 1}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Amount Paid</span>
                <span className="font-black text-sm text-neutral-900">
                  {formatRupees(selectedTx.pricing?.finalPayablePaise || (selectedTx.payment as any)?.amountPaise || 150)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Payment Status</span>
                <span className="font-bold text-emerald-700">PAID (Razorpay)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Date</span>
                <span className="text-neutral-700">
                  {new Date(selectedTx.createdAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
