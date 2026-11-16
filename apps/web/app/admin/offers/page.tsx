"use client";

import React, { useEffect, useState } from "react";
import {
  TicketPercent,
  Plus,
  Users,
  CheckCircle2,
  Trash2,
  Tag,
  Percent,
  Coins,
  Copy,
  Check,
  SwitchCamera,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { ref, onValue, set, remove, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, Offer, ReferralCode } from "@printmart/shared";

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [referrals, setReferrals] = useState<ReferralCode[]>([]);
  const [activeTab, setActiveTab] = useState<"coupons" | "referrals">("coupons");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals
  const [isOfferModalOpen, setIsOfferModalOpen] = useState<boolean>(false);
  const [isRefModalOpen, setIsRefModalOpen] = useState<boolean>(false);

  // New Coupon Form State
  const [code, setCode] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minOrderRupees, setMinOrderRupees] = useState<string>("5.00");
  const [maxDiscountRupees, setMaxDiscountRupees] = useState<string>("50.00");
  const [usageLimit, setUsageLimit] = useState<number>(1000);

  // New Referral State
  const [refCode, setRefCode] = useState<string>("");
  const [refDiscount, setRefDiscount] = useState<number>(15);

  useEffect(() => {
    // Listen to offers
    const offersRef = ref(database, "offers");
    const unsubOffers = onValue(offersRef, (snap) => {
      if (snap.exists()) {
        setOffers(Object.values(snap.val()));
      } else {
        // Initial welcome coupon if empty
        const defaultOffer: Offer = {
          offerId: "OFFER_WELCOME",
          code: "WELCOME50",
          title: "Flat 50% Off First Print",
          description: "New user welcome coupon",
          discountType: "PERCENTAGE",
          discountValue: 50,
          minOrderPaise: 200,
          maxDiscountPaise: 2000,
          minPages: 1,
          validFrom: Date.now() - 10000,
          validUntil: Date.now() + 365 * 24 * 60 * 60 * 1000,
          globalUsageLimit: 1000,
          perUserUsageLimit: 1,
          currentUsage: 0,
          applicableMachines: ["ALL"],
          active: true,
        };
        set(ref(database, "offers/OFFER_WELCOME"), defaultOffer);
      }
    });

    // Listen to referrals
    const refRef = ref(database, "referrals");
    const unsubRef = onValue(refRef, (snap) => {
      if (snap.exists()) {
        setReferrals(Object.values(snap.val()));
      } else {
        setReferrals([]);
      }
    });

    return () => {
      unsubOffers();
      unsubRef();
    };
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleOfferActive = async (offerId: string, currentStatus: boolean) => {
    await update(ref(database, `offers/${offerId}`), {
      active: !currentStatus,
    });
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;

    const offerId = `OFFER_${code.trim().toUpperCase()}`;
    const minOrderPaise = Math.round(parseFloat(minOrderRupees || "0") * 100);
    const maxDiscountPaise = Math.round(parseFloat(maxDiscountRupees || "0") * 100);

    const newOffer: Offer = {
      offerId,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || title.trim(),
      discountType,
      discountValue: Number(discountValue) || 10,
      minOrderPaise,
      maxDiscountPaise: discountType === "PERCENTAGE" ? maxDiscountPaise : minOrderPaise,
      minPages: 1,
      validFrom: Date.now(),
      validUntil: Date.now() + 365 * 24 * 60 * 60 * 1000,
      globalUsageLimit: Number(usageLimit) || 1000,
      perUserUsageLimit: 1,
      currentUsage: 0,
      applicableMachines: ["ALL"],
      active: true,
    };

    await set(ref(database, `offers/${offerId}`), newOffer);
    setCode("");
    setTitle("");
    setDescription("");
    setIsOfferModalOpen(false);
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCode.trim()) return;

    const cleanCode = refCode.trim().toUpperCase();
    const newRef: ReferralCode = {
      code: cleanCode,
      ownerUid: "ADMIN_PROGRAM",
      refereeDiscountPercent: Number(refDiscount) || 15,
      rewardPaise: 500,
      totalConversions: 0,
      active: true,
      createdAt: Date.now(),
    };

    await set(ref(database, `referrals/${cleanCode}`), newRef);
    setRefCode("");
    setIsRefModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Offers, Coupons & Referrals
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage student promo codes, flat vouchers, and viral referral incentives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "coupons" ? (
            <button
              type="button"
              onClick={() => setIsOfferModalOpen(true)}
              className="px-4 py-2 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRefModalOpen(true)}
              className="px-4 py-2 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border-0"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Referral Code</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2 p-1 bg-neutral-200/70 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("coupons")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 flex items-center gap-2 ${
            activeTab === "coupons"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-[#0c831f]" />
          <span>Promotional Coupons ({offers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("referrals")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 flex items-center gap-2 ${
            activeTab === "referrals"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Referral Codes ({referrals.length})</span>
        </button>
      </div>

      {/* ── Tab 1: Coupons Table ── */}
      {activeTab === "coupons" && (
        <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Offer Title</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Min Order</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400 text-xs">
                      No promo coupons active. Click &quot;Create Coupon&quot; to launch a promotion.
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => (
                    <tr key={offer.offerId} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-emerald-50 text-[#0c831f] px-2.5 py-1 rounded-lg border border-emerald-200">
                            {offer.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(offer.code)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer border-0"
                            title="Copy code"
                          >
                            {copiedCode === offer.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900">{offer.title}</span>
                          <span className="text-[11px] text-neutral-500">{offer.description}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-900">
                          {offer.discountType === "PERCENTAGE"
                            ? `${offer.discountValue}% OFF`
                            : `₹${offer.discountValue} FLAT`}
                        </span>
                        {offer.maxDiscountPaise && offer.discountType === "PERCENTAGE" && (
                          <span className="text-[10px] text-neutral-400 block">
                            up to {formatRupees(offer.maxDiscountPaise)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-neutral-600 font-semibold">
                        {formatRupees(offer.minOrderPaise)}
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        <strong>{offer.currentUsage || 0}</strong> / {offer.globalUsageLimit}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleOfferActive(offer.offerId, Boolean(offer.active))}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border-0 transition-all ${
                            offer.active
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          {offer.active ? "Active" : "Disabled"}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => remove(ref(database, `offers/${offer.offerId}`))}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border-0"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: Referrals Table ── */}
      {activeTab === "referrals" && (
        <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Referral Code</th>
                  <th className="py-3 px-4">Referee Discount</th>
                  <th className="py-3 px-4">Referrer Reward</th>
                  <th className="py-3 px-4">Total Conversions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400 text-xs">
                      No referral codes created yet. Click &quot;Generate Referral Code&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  referrals.map((refItem) => (
                    <tr key={refItem.code} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                            {refItem.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(refItem.code)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer border-0"
                            title="Copy code"
                          >
                            {copiedCode === refItem.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {refItem.refereeDiscountPercent}% OFF first order
                      </td>

                      <td className="py-3 px-4 font-semibold text-emerald-700">
                        {formatRupees(refItem.rewardPaise || 500)} in wallet
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        <strong>{refItem.totalConversions || 0}</strong> successful prints
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => remove(ref(database, `referrals/${refItem.code}`))}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border-0"
                          title="Delete Referral Code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Create Coupon ── */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleCreateOffer}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-0 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">Create New Coupon</h3>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold text-sm cursor-pointer border-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SEMESTER50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 50% Off Exam Prints"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-medium focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">Discount Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENTAGE")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      discountType === "PERCENTAGE"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200"
                    }`}
                  >
                    % Percentage Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("FLAT")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      discountType === "FLAT"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200"
                    }`}
                  >
                    ₹ Flat Amount Off
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1">
                    {discountType === "PERCENTAGE" ? "Discount %" : "Flat Discount (₹)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === "PERCENTAGE" ? "100" : "500"}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={minOrderRupees}
                    onChange={(e) => setMinOrderRupees(e.target.value)}
                    className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                  />
                </div>
              </div>

              {discountType === "PERCENTAGE" && (
                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={maxDiscountRupees}
                    onChange={(e) => setMaxDiscountRupees(e.target.value)}
                    className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold cursor-pointer border-0 shadow-xs"
              >
                Create Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal: Create Referral Code ── */}
      {isRefModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <form
            onSubmit={handleCreateReferral}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border-0 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-bold text-base text-neutral-900">Generate Referral Code</h3>
              <button
                type="button"
                onClick={() => setIsRefModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold text-sm cursor-pointer border-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">Referral Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAMPUS-AMBASSADOR"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1">
                  Friend Discount (% Off First Print)
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  required
                  value={refDiscount}
                  onChange={(e) => setRefDiscount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-bold focus:ring-2 focus:ring-[#0c831f] focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRefModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0c831f] hover:bg-[#0a6e1a] text-white text-xs font-bold cursor-pointer border-0 shadow-xs"
              >
                Generate Code
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
