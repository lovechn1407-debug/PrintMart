"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Camera,
  Edit2,
  Check,
  X,
  Printer,
  MessageSquare,
  LifeBuoy,
  Receipt,
  PhoneCall,
  HelpCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  LogOut,
  CheckCircle2,
  Send,
  ExternalLink,
  Mail,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { auth, database, ref, set, onValue, update } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { PrintJob } from "@printmart/shared";

// ── TYPES ──
type ModalType =
  | null
  | "transactions"
  | "faq"
  | "contact"
  | "terms"
  | "privacy"
  | "refund"
  | "return"
  | "disclaimer";

interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
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

const POLICIES_DATA = {
  terms: {
    title: "Terms and Conditions",
    badge: "Campus Usage Agreement",
    sections: [
      {
        h: "1. Campus Platform Overview",
        p: "PrintMart provides automated, cloud-connected self-service printing kiosks across college and university campuses. By using the PrintMart web application, uploading files, or redeeming universal OTP codes at any campus kiosk, you agree to comply with these terms.",
      },
      {
        h: "2. Universal OTP System",
        p: "Upon successful payment, PrintMart generates a unique 6-digit Universal One-Time Password (OTP). This universal OTP is valid at ANY operational PrintMart kiosk on campus for a duration of 24 hours. The code is single-use and automatically expires once document spooling is completed or after 24 hours.",
      },
      {
        h: "3. Document Storage & Cloud Vault",
        p: "Uploaded documents are temporarily stored in an encrypted cloud vault solely for printing purposes. In accordance with campus data privacy protocols, all uploaded files are permanently deleted automatically after 7 days (Time-To-Live). Users must retain original copies of their documents.",
      },
      {
        h: "4. Prohibited Content & Academic Integrity",
        p: "Users are strictly prohibited from printing unauthorized examination question papers, leaked internal university documents, counterfeit certificates, copyrighted textbooks without fair-use clearance, or illicit/offensive materials. PrintMart reserves the right to suspend accounts violating campus regulations.",
      },
      {
        h: "5. Hardware Safety & Kiosk Etiquette",
        p: "Users must not pull or force paper trays, disconnect power cables, or tamper with kiosk touchscreens and printer assemblies. Any observed hardware issues must be reported through the Help & Support tab.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    badge: "Zero-Log Data Protection",
    sections: [
      {
        h: "1. Zero-Log Document Security",
        p: "We respect your academic privacy. PrintMart never indexes, reads, shares, or permanently stores the text or imagery inside your uploaded documents. Files are spooled directly to the hardware printer in memory and purged upon job completion.",
      },
      {
        h: "2. Automatic 7-Day Purge",
        p: "Files in our cloud vault are cryptographically tied to your user ID and are hard-deleted automatically 7 days after upload, leaving no historical trace on storage servers.",
      },
      {
        h: "3. Personal Information Collected",
        p: "We collect only your Name, Email Address, and Google Profile Picture via Google OAuth to provide order history tracking, support ticket updates, and payment receipts.",
      },
      {
        h: "4. Payment Information",
        p: "All payment transactions are encrypted and processed by Razorpay in compliance with PCI-DSS Level 1 standards. PrintMart never stores or has access to your UPI PINs, credit/debit card numbers, or banking credentials.",
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    badge: "100% Fairness Guarantee",
    sections: [
      {
        h: "1. Campus Fairness Guarantee",
        p: "If your printing job fails due to kiosk hardware or software failure, you are entitled to a full refund or an instant replacement reprint credit.",
      },
      {
        h: "2. Eligible Refund Conditions",
        p: "Refunds are promptly approved in the following cases: (a) Printer ran out of paper or experienced a paper jam mid-job; (b) Ink toner faded, resulting in unreadable text; (c) Kiosk power outage or network loss during printing; (d) Payment deducted from bank but universal OTP was not generated or expired unconsumed.",
      },
      {
        h: "3. Ineligible Scenarios",
        p: "Refunds cannot be granted for user-side errors such as uploading a blank or corrupt file, selecting the wrong page numbers, choosing Black & White instead of Color by mistake, or changing your mind after paper has been printed.",
      },
      {
        h: "4. Resolution & Refund Timeline",
        p: "Refund requests submitted through Help & Support are reviewed within campus hours. Once verified, refunds are credited back to your original source UPI account or bank within 2 to 3 business days.",
      },
    ],
  },
  return: {
    title: "Return Policy",
    badge: "Custom Physical Goods",
    sections: [
      {
        h: "1. Custom Printed Physical Items",
        p: "Because printed documents are customized physical items manufactured on-demand with your personalized content, successfully printed sheets cannot be physically returned or resold.",
      },
      {
        h: "2. Defective Print Replacement",
        p: "If physical prints emerge with roller oil marks, torn corners, ink streaks, or misalignment caused by printer rollers, simply take a photo of the printed sheet and upload it in the Help & Support tab within 2 hours of collection for an instant reprint token.",
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    badge: "Service Notice",
    sections: [
      {
        h: "1. Kiosk Availability & Campus Uptime",
        p: "While PrintMart strives for 99.9% kiosk availability across campus, service may occasionally be disrupted due to campus building power maintenance, campus Wi-Fi outages, or scheduled maintenance.",
      },
      {
        h: "2. Margin & Resolution Preview Fidelity",
        p: "The Print Studio preview renders documents as closely as possible to standard A4 specifications. Users are responsible for ensuring that critical text or graphics are within standard 0.5-inch printable margins.",
      },
      {
        h: "3. Academic Deadlines",
        p: "PrintMart is not liable for academic penalties, missed class assignments, or submission delays resulting from last-minute kiosk queue delays. We strongly recommend printing assignments at least 30 minutes before submission deadlines.",
      },
    ],
  },
};

const FAQS_DATA = [
  {
    q: "How does the Universal OTP work at the campus kiosk?",
    a: "Your 6-digit OTP is universal across all PrintMart kiosks on campus! You do not need to choose a machine in advance. Simply walk up to any available kiosk, tap 'Enter OTP', type your 6-digit code, and your documents will immediately spool and print.",
  },
  {
    q: "What if the kiosk runs out of paper while printing my document?",
    a: "Don't panic! The kiosk detects the paper outage and securely pauses. Go to the 'Need help?' section and raise a ticket with category 'Incomplete Pages' or 'Page not printed'. We will verify the spool count and issue an instant reprint code or full refund within minutes.",
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
];

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function formatRupees(paise: number = 0): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function MorePage() {
  const router = useRouter();
  const { user, profile, signInWithGoogle, signOut } = useAuth();

  // Exit Animation State
  const [isExiting, setIsExiting] = useState<boolean>(false);

  // Active Bottom Sheet Modal
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Dedicated Help & Support Window
  const [isHelpWindowOpen, setIsHelpWindowOpen] = useState<boolean>(false);
  const [showActiveTicketsList, setShowActiveTicketsList] = useState<boolean>(false);
  const [ticketSuccessSnackbar, setTicketSuccessSnackbar] = useState<string | null>(null);

  // In-App Error Notification Popup
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<PrintJob[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<PrintJob | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Help & Support Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<string>(COMMON_PROBLEMS[0]);
  const [ticketOtp, setTicketOtp] = useState<string>("");
  const [ticketDesc, setTicketDesc] = useState<string>("");
  const [ticketImageFile, setTicketImageFile] = useState<File | null>(null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null);
  const [ticketSubmitting, setTicketSubmitting] = useState<boolean>(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);

  // Back Navigation with Smooth Exit
  const handleGoBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.push("/");
    }, 160);
  };

  // Listen for navigation exit from AppNavbar
  useEffect(() => {
    const handleExit = () => setIsExiting(true);
    window.addEventListener("more-page-exit", handleExit);
    return () => window.removeEventListener("more-page-exit", handleExit);
  }, []);

  // Prevent background scrolling when any modal, ticket window, or popup is open
  useEffect(() => {
    if (activeModal || isHelpWindowOpen || selectedTx || errorMessage) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [activeModal, isHelpWindowOpen, selectedTx, errorMessage]);

  // Sync profile display name
  useEffect(() => {
    setNameInput(profile?.displayName || user?.displayName || "Love Chauhan");
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
        const mine = allJobs
          .filter((j) => j.userId === user.uid)
          .sort((a, b) => b.createdAt - a.createdAt);
        setTransactions(mine);
      } else {
        setTransactions([]);
      }
      setTxLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Load User's Tickets
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

  // Auto-dismiss success snackbar after 6 seconds
  useEffect(() => {
    if (!ticketSuccessSnackbar) return;
    const timer = setTimeout(() => {
      setTicketSuccessSnackbar(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [ticketSuccessSnackbar]);

  // Handle Save Name
  const handleSaveName = async () => {
    if (!nameInput.trim() || !auth.currentUser) return;
    setSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nameInput.trim() });
      await update(ref(database, `users/${auth.currentUser.uid}`), { displayName: nameInput.trim() });
      setIsEditingName(false);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to update profile name");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Photo Select
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !auth.currentUser) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Profile image must be smaller than 5MB");
      return;
    }
    setSavingProfile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      try {
        await updateProfile(auth.currentUser!, { photoURL: base64Url });
        await update(ref(database, `users/${auth.currentUser!.uid}`), { photoURL: base64Url });
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to update profile photo");
      } finally {
        setSavingProfile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Ticket Submit
  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim()) {
      setErrorMessage("Please enter a short description of the issue.");
      return;
    }
    setTicketSubmitting(true);
    try {
      let uploadedImageUrl = "";
      if (ticketImageFile) {
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
        userName: profile?.displayName || user?.displayName || nameInput || "Campus Customer",
        userEmail: user?.email || "student@campus.edu",
        category: ticketCategory,
        otp: ticketOtp.trim() || undefined,
        description: ticketDesc.trim(),
        imageUrl: uploadedImageUrl || undefined,
        status: "OPEN",
        createdAt: Date.now(),
      };

      await set(ref(database, `supportTickets/${ticketId}`), newTicket);
      setTicketSuccessSnackbar(ticketId);
      setTicketDesc("");
      setTicketOtp("");
      setTicketImageFile(null);
      setTicketImagePreview(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit support ticket");
    } finally {
      setTicketSubmitting(false);
    }
  };

  const displayName = profile?.displayName || user?.displayName || nameInput || "Love Chauhan";
  const userPhoto = profile?.photoURL || user?.photoURL;
  const subtext = user?.email || "8383090874 • PrintMart Campus";

  return (
    <div
      className={`min-h-screen w-full max-w-full bg-[#f3f4f7] text-neutral-900 pb-28 select-none overflow-x-hidden ${
        isExiting ? "animate-screen-slide-out" : "animate-screen-slide-in"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. BLINKIT-STYLE TOP GOLDEN GRADIENT HERO BANNER
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-[#fcd462] via-[#fae07c] to-[#f3f4f7] pt-3 pb-6 px-4 w-full overflow-hidden">
        {/* Back Button */}
        <div className="max-w-md mx-auto flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handleGoBack}
            title="Go to Home"
            className="w-9 h-9 rounded-full bg-white shadow-xs border-0 flex items-center justify-center text-neutral-800 hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-800" />
          </button>
        </div>

        {/* Profile Avatar & Centered Name */}
        <div className="max-w-md mx-auto flex flex-col items-center text-center">
          {/* Avatar with Camera badge */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-white shadow-md border-4 border-white flex items-center justify-center overflow-hidden">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 text-white flex items-center justify-center">
                  <User className="w-12 h-12 text-white/90" />
                </div>
              )}
            </div>

            {/* Camera Edit Badge */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              title="Change Profile Photo"
              className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md hover:bg-neutral-800 active:scale-90 transition-all cursor-pointer border-2 border-white"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Profile Name & Centered Inline Edit (No overflow outside viewport) */}
          <div className="mt-3 w-full flex flex-col items-center">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-1.5 mt-0.5 max-w-full px-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-8 px-2.5 text-sm font-semibold bg-white border-0 shadow-xs rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0c831f] max-w-[200px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingProfile}
                  className="h-8 px-2.5 bg-[#0c831f] text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="h-8 px-2 text-xs text-neutral-500 hover:text-neutral-800 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 max-w-full px-2">
                <span className="w-5 h-5 invisible shrink-0" aria-hidden="true" />
                <h1 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight text-center truncate max-w-[260px]">
                  {displayName}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  title="Edit Name"
                  className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs font-medium text-neutral-600 mt-1">
              {subtext}
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN BODY (BLINKIT 3-CARD ROW + GROUPED LISTS)
          ───────────────────────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-3.5 -mt-2 space-y-4">
        {/* 3 Quick Action Cards Row */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card 1: Your orders */}
          <Link
            href="/user/history"
            className="bg-white rounded-xl p-3 sm:p-3.5 border-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center text-center gap-2 hover:shadow-md active:scale-95 transition-all"
          >
            <Printer className="w-6 h-6 text-neutral-800" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-neutral-900 leading-tight">
              Your orders
            </span>
          </Link>

          {/* Card 2: My transactions */}
          <button
            type="button"
            onClick={() => setActiveModal("transactions")}
            className="bg-white rounded-xl p-3 sm:p-3.5 border-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center text-center gap-2 hover:shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center text-neutral-800 font-bold text-lg leading-none">
              ₹
            </div>
            <span className="text-xs font-semibold text-neutral-900 leading-tight">
              My transactions
            </span>
          </button>

          {/* Card 3: Need help? */}
          <button
            type="button"
            onClick={() => setIsHelpWindowOpen(true)}
            className="bg-white rounded-xl p-3 sm:p-3.5 border-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center text-center gap-2 hover:shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <MessageSquare className="w-6 h-6 text-neutral-800" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-neutral-900 leading-tight">
              Need help?
            </span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            GROUP 1: YOUR INFORMATION
            ───────────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight px-1">
            Your information
          </h2>
          <div className="bg-white rounded-2xl border-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-neutral-100">
            {/* Help & Support */}
            <button
              type="button"
              onClick={() => setIsHelpWindowOpen(true)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LifeBuoy className="w-5 h-5 text-neutral-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c] block">
                    Help and support
                  </span>
                  <span className="text-[11px] text-neutral-400 block font-normal">
                    Raise tickets for failed prints, faded ink, paper jams
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#0c831f] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  NEW
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>
            </button>

            {/* My Transactions */}
            <button
              type="button"
              onClick={() => setActiveModal("transactions")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-neutral-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c] block">
                    My transactions & receipts
                  </span>
                  <span className="text-[11px] text-neutral-400 block font-normal">
                    Order bills, Razorpay IDs, and UPI invoices
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Contact Support */}
            <button
              type="button"
              onClick={() => setActiveModal("contact")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <PhoneCall className="w-5 h-5 text-neutral-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c] block">
                    Contact campus support
                  </span>
                  <span className="text-[11px] text-neutral-400 block font-normal">
                    Mail: lovechn1407@gmail.com • Phone: 8383090874
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* FAQ */}
            <button
              type="button"
              onClick={() => setActiveModal("faq")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-neutral-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c] block">
                    Frequently asked questions
                  </span>
                  <span className="text-[11px] text-neutral-400 block font-normal">
                    Universal OTP, kiosk usage, refunds & privacy
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            GROUP 2: LEGAL AND POLICIES
            ───────────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight px-1">
            Legal and policies
          </h2>
          <div className="bg-white rounded-2xl border-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-neutral-100">
            {/* Terms and Conditions */}
            <button
              type="button"
              onClick={() => setActiveModal("terms")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-neutral-700 shrink-0" />
                <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c]">
                  Terms and conditions
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Privacy Policy */}
            <button
              type="button"
              onClick={() => setActiveModal("privacy")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-neutral-700 shrink-0" />
                <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c]">
                  Privacy policy
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Refund Policy (Requirement 3: GUARANTEE pill removed) */}
            <button
              type="button"
              onClick={() => setActiveModal("refund")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-neutral-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c] block">
                    Refund policy
                  </span>
                  <span className="text-[11px] text-neutral-400 block font-normal">
                    100% fairness guarantee for failed prints
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Return Policy */}
            <button
              type="button"
              onClick={() => setActiveModal("return")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-neutral-700 shrink-0" />
                <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c]">
                  Return policy
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Disclaimer */}
            <button
              type="button"
              onClick={() => setActiveModal("disclaimer")}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50/80 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-neutral-700 shrink-0" />
                <span className="text-xs sm:text-[13.5px] font-medium text-[#1c1c1c]">
                  Disclaimer
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            GROUP 3: ACCOUNT ACTIONS
            ───────────────────────────────────────────────────────────── */}
        <div className="pt-2">
          {user ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full h-12 bg-neutral-950 hover:bg-black text-white rounded-xl border-0 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold active:scale-98 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>Log out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="w-full h-12 bg-[#0c831f] hover:bg-[#0a6e1a] text-white rounded-xl border-0 shadow-xs flex items-center justify-center gap-2 text-xs sm:text-sm font-bold active:scale-98 transition-all cursor-pointer"
            >
              <span>Sign in with Google</span>
            </button>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BRAND SIGNATURE: PRINTMART | AS STUDIOS
            ───────────────────────────────────────────────────────────── */}
        <div className="pt-6 pb-2 flex flex-col items-center justify-center gap-2 select-none">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/brand/printmart-logo.webp"
              alt="PrintMart"
              className="h-7 w-auto object-contain"
            />
            <span className="text-neutral-300 font-light text-base leading-none">|</span>
            <img
              src="/brand/as-studios-logo.png"
              alt="AS Studios"
              className="h-6 w-auto object-contain"
            />
          </div>
          <p className="text-[11px] font-medium text-neutral-400 tracking-tight">
            a product of AS Studios
          </p>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          HELP & SUPPORT FULL WINDOW
          ───────────────────────────────────────────────────────────── */}
      {isHelpWindowOpen && (
        <div className="fixed inset-0 z-50 bg-[#f3f4f7] overflow-y-auto overscroll-contain animate-in slide-in-from-right duration-200 flex flex-col pb-12">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white border-0 shadow-2xs px-4 h-14 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsHelpWindowOpen(false);
                  setTicketSuccessSnackbar(null);
                }}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-800 transition-colors cursor-pointer border-0"
              >
                <ArrowLeft className="w-5 h-5 text-neutral-800" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-neutral-900 leading-tight">Help and Support</h2>
                <p className="text-[11px] text-neutral-500">Raise campus issue or check tickets</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsHelpWindowOpen(false);
                setTicketSuccessSnackbar(null);
              }}
              className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer border-0"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Body Content */}
          <div className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
            {/* Green Button of My Active Tickets */}
            <button
              type="button"
              onClick={() => setShowActiveTicketsList((prev) => !prev)}
              className="w-full h-12 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold text-xs sm:text-sm rounded-xl border-0 shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LifeBuoy className="w-4 h-4 text-white" />
              <span>
                {showActiveTicketsList
                  ? "Hide Active Tickets"
                  : `My Active Tickets (${userTickets.length})`}
              </span>
            </button>

            {/* Active Tickets Drawer List */}
            {showActiveTicketsList && (
              <div className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border-0 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="text-xs font-bold text-neutral-900">Your Campus Tickets</span>
                  <span className="text-[11px] font-medium text-neutral-500">{userTickets.length} total</span>
                </div>
                {userTickets.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">No active tickets right now.</p>
                ) : (
                  <div className="space-y-2.5">
                    {userTickets.map((t) => (
                      <div key={t.ticketId} className="p-3 bg-neutral-50 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-neutral-800">{t.ticketId}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-neutral-700">{t.category}</div>
                        <p className="text-[11px] text-neutral-500 line-clamp-2">{t.description}</p>
                        {t.otp && (
                          <div className="text-[10px] text-neutral-400">
                            Universal OTP: <span className="font-mono font-bold text-neutral-600">{t.otp}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ticket Creation Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border-0 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Raise a Support Ticket</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Faced a paper jam, faded ink, or print failure? We review and resolve within 15 minutes.
                </p>
              </div>

              <form onSubmit={handleRaiseTicket} className="space-y-4">
                {/* Common Problem Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Common Problem <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full h-11 px-3.5 pr-10 text-xs font-medium bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white appearance-none cursor-pointer"
                    >
                      {COMMON_PROBLEMS.map((prob) => (
                        <option key={prob} value={prob}>
                          {prob}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* OTP Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Universal OTP (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={ticketOtp}
                    onChange={(e) => setTicketOtp(e.target.value.toUpperCase())}
                    placeholder="e.g. 748291"
                    className="w-full h-11 px-3.5 text-xs font-mono font-bold bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white"
                  />
                </div>

                {/* Problem Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Describe the issue <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Explain what went wrong (e.g. 3 of 10 pages printed, ink was faded, paper jammed in kiosk tray)..."
                    className="w-full p-3 text-xs bg-neutral-50 rounded-xl text-neutral-900 border-0 focus:ring-2 focus:ring-[#0c831f] focus:bg-white resize-none"
                  />
                </div>

                {/* Photo Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Attach Photo Proof (Recommended)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => ticketFileInputRef.current?.click()}
                      className="h-10 px-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer border-0"
                    >
                      <Camera className="w-4 h-4 text-neutral-600" />
                      <span>{ticketImageFile ? "Change Photo" : "Upload Image"}</span>
                    </button>
                    <input
                      ref={ticketFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0];
                          if (f.size > 5 * 1024 * 1024) {
                            setErrorMessage("Photo proof must be smaller than 5MB");
                            return;
                          }
                          setTicketImageFile(f);
                          setTicketImagePreview(URL.createObjectURL(f));
                        }
                      }}
                      className="hidden"
                    />
                    {ticketImageFile && (
                      <span className="text-xs text-neutral-500 truncate max-w-[150px]">
                        {ticketImageFile.name}
                      </span>
                    )}
                  </div>
                  {ticketImagePreview && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border-0 shadow-2xs">
                      <img src={ticketImagePreview} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Submit Ticket Button */}
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="w-full h-11 bg-neutral-950 hover:bg-black disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl border-0 shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {ticketSubmitting ? (
                    <span>Submitting Ticket...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Green Snackbar with No Border */}
          {ticketSuccessSnackbar && (
            <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-60 animate-in slide-in-from-bottom duration-200">
              <div className="bg-[#0c831f] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                  <div className="text-xs leading-tight">
                    <span className="font-extrabold block">Ticket Created Successfully!</span>
                    <span className="text-white/80 text-[11px] font-mono">
                      ID: {ticketSuccessSnackbar} • We will resolve shortly.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketSuccessSnackbar(null)}
                  className="w-7 h-7 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white shrink-0 cursor-pointer border-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SWIPE POPUP 1: MY TRANSACTIONS (BOTTOM SHEET)
          (Scroll locked, touch-pan isolated, no background bleeding)
          ───────────────────────────────────────────────────────────── */}
      {activeModal === "transactions" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overscroll-none touch-none animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border-0 overflow-hidden touch-auto overscroll-contain animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Pill */}
            <div className="w-12 h-1 rounded-full bg-neutral-300 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0c831f]" />
                <h3 className="font-bold text-sm sm:text-base text-neutral-900">
                  My Transactions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-neutral-200/60 flex items-center justify-center text-neutral-700 hover:bg-neutral-300 transition-colors border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Isolated touch scroll */}
            <div
              className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y divide-y divide-neutral-100 flex-1"
              style={{ WebkitOverflowScrolling: "touch" }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {txLoading ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading orders...</div>
              ) : !user ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  Please sign in to view your past transactions.
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Receipt className="w-10 h-10 text-neutral-300 mx-auto" />
                  <p className="text-xs text-neutral-500">No print transactions yet.</p>
                  <Link
                    href="/user/print"
                    onClick={() => setActiveModal(null)}
                    className="inline-block mt-2 text-xs font-bold text-[#0c831f] hover:underline"
                  >
                    Start your first print job →
                  </Link>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isRefund =
                    tx.payment?.status === "REFUNDED" || (tx as any).status === "REFUNDED";
                  const amountPaise =
                    tx.pricing?.finalPayablePaise || (tx.payment as any)?.amountPaise || 150;
                  const formattedAmt = formatRupees(amountPaise);
                  const pageCount =
                    tx.configuration?.totalPagesToPrint || (tx as any).pageCount || 1;

                  return (
                    <div
                      key={tx.jobId}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-neutral-900 truncate">
                          {tx.documentName || "Document.pdf"}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                          <span>
                            {new Date(tx.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {pageCount} {pageCount === 1 ? "page" : "pages"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        <span
                          className={`text-sm font-bold ${
                            isRefund ? "text-[#0c831f]" : "text-rose-600"
                          }`}
                        >
                          {isRefund ? `+${formattedAmt}` : `-${formattedAmt}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 underline underline-offset-2 cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SWIPE POPUP 2: CONTACT SUPPORT (BOTTOM SHEET)
          ───────────────────────────────────────────────────────────── */}
      {activeModal === "contact" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overscroll-none touch-none animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border-0 overflow-hidden touch-auto overscroll-contain animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Pill */}
            <div className="w-12 h-1 rounded-full bg-neutral-300 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm sm:text-base text-neutral-900">
                  Contact Campus Support
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-neutral-200/60 flex items-center justify-center text-neutral-700 hover:bg-neutral-300 transition-colors border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div
              className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-2.5 flex-1"
              style={{ WebkitOverflowScrolling: "touch" }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Mail */}
              <a
                href="mailto:lovechn1407@gmail.com?subject=PrintMart%20Support%20Request"
                className="p-3.5 rounded-xl bg-neutral-100/70 hover:bg-neutral-100 transition-all flex items-center justify-between group border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Email Support
                    </span>
                    <span className="text-xs font-semibold text-[#1c1c1c]">lovechn1407@gmail.com</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-[#0c831f]" />
              </a>

              {/* Phone */}
              <a
                href="tel:8383090874"
                className="p-3.5 rounded-xl bg-neutral-100/70 hover:bg-neutral-100 transition-all flex items-center justify-between group border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Phone Call
                    </span>
                    <span className="text-xs font-semibold text-[#1c1c1c]">8383090874</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-sky-700" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/918383090874?text=Hi%20PrintMart%20Support,%20I%20need%20help%20with%20my%20print"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-neutral-100/70 hover:bg-neutral-100 transition-all flex items-center justify-between group border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      WhatsApp Chat
                    </span>
                    <span className="text-xs font-semibold text-[#1c1c1c]">8383090874</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-[#0c831f]" />
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/love_chn.14"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-neutral-100/70 hover:bg-neutral-100 transition-all flex items-center justify-between group border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Instagram Direct
                    </span>
                    <span className="text-xs font-semibold text-[#1c1c1c]">@love_chn.14</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-pink-700" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SWIPE POPUP 3: FAQ (BOTTOM SHEET)
          ───────────────────────────────────────────────────────────── */}
      {activeModal === "faq" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overscroll-none touch-none animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border-0 overflow-hidden touch-auto overscroll-contain animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Pill */}
            <div className="w-12 h-1 rounded-full bg-neutral-300 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm sm:text-base text-neutral-900">
                  Frequently Asked Questions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-neutral-200/60 flex items-center justify-center text-neutral-700 hover:bg-neutral-300 transition-colors border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div
              className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-2 flex-1"
              style={{ WebkitOverflowScrolling: "touch" }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {FAQS_DATA.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="rounded-xl border-0 overflow-hidden bg-neutral-100/70">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 font-semibold text-xs text-[#1c1c1c] hover:bg-neutral-200/40 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${
                          isOpen ? "rotate-180 text-[#0c831f]" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-200/50 pt-2 animate-in fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SWIPE POPUP 4: POLICIES VIEWER (BOTTOM SHEET)
          ───────────────────────────────────────────────────────────── */}
      {(activeModal === "terms" ||
        activeModal === "privacy" ||
        activeModal === "refund" ||
        activeModal === "return" ||
        activeModal === "disclaimer") && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overscroll-none touch-none animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border-0 overflow-hidden touch-auto overscroll-contain animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Pill */}
            <div className="w-12 h-1 rounded-full bg-neutral-300 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-neutral-800" />
                <h3 className="font-bold text-sm sm:text-base text-neutral-900">
                  {POLICIES_DATA[activeModal].title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-neutral-200/60 flex items-center justify-center text-neutral-700 hover:bg-neutral-300 transition-colors border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div
              className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-3.5 flex-1"
              style={{ WebkitOverflowScrolling: "touch" }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 inline-block">
                {POLICIES_DATA[activeModal].badge}
              </span>
              <div className="space-y-3">
                {POLICIES_DATA[activeModal].sections.map((sec, idx) => (
                  <div key={idx} className="space-y-1">
                    <h4 className="text-xs font-semibold text-neutral-900">{sec.h}</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed font-normal">{sec.p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ITEMIZED RECEIPT (POPUP)
          ───────────────────────────────────────────────────────────── */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overscroll-none touch-none animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTx(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border-0 shadow-2xl space-y-4 touch-auto overscroll-contain animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0c831f]" />
                <span className="font-bold text-sm text-neutral-900">Payment Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-neutral-400 hover:text-neutral-700 border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Document</span>
                <span className="font-semibold text-neutral-900 truncate max-w-[170px]">
                  {selectedTx.documentName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Universal OTP</span>
                <span className="font-mono font-bold text-neutral-900">
                  {selectedTx.otp || (selectedTx as any).otpCode || "------"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Total Pages</span>
                <span className="font-semibold text-neutral-900">
                  {selectedTx.configuration?.totalPagesToPrint || (selectedTx as any).pageCount || 1}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Amount Paid</span>
                <span className="font-bold text-sm text-neutral-900">
                  {formatRupees(
                    selectedTx.pricing?.finalPayablePaise ||
                      (selectedTx.payment as any)?.amountPaise ||
                      150
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Payment Status</span>
                <span className="font-semibold text-emerald-700">PAID (Razorpay)</span>
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
              className="w-full h-10 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all border-0 cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          IN-APP ERROR NOTIFICATION POPUP
          ───────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overscroll-none touch-none animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setErrorMessage(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border-0 space-y-3 touch-auto overscroll-contain animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-neutral-900">Notification</h4>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="w-full h-10 bg-neutral-950 hover:bg-black text-white font-bold text-xs rounded-xl transition-all border-0 cursor-pointer"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
