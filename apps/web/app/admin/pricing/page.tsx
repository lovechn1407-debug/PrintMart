"use client";

import React, { useEffect, useState } from "react";
import {
  Coins,
  Save,
  CheckCircle2,
  Sparkles,
  Percent,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { ref, onValue, set } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { DEFAULT_GLOBAL_PRICING, formatRupees, GlobalPricing } from "@printmart/shared";

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<GlobalPricing>(DEFAULT_GLOBAL_PRICING);
  const [bwRupees, setBwRupees] = useState<string>("1.50");
  const [colorRupees, setColorRupees] = useState<string>("5.00");
  const [serviceChargeRupees, setServiceChargeRupees] = useState<string>("0.00");
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const pricingRef = ref(database, "pricing/global");
    const unsub = onValue(pricingRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as GlobalPricing;
        setPricing(val);
        setBwRupees((val.bwPerSidePaise / 100).toFixed(2));
        setColorRupees((val.colorPerSidePaise / 100).toFixed(2));
        setServiceChargeRupees(((val.serviceChargePaise || 0) / 100).toFixed(2));
      }
    });

    return () => unsub();
  }, []);

  const handleApplyPreset = (bw: string, col: string) => {
    setBwRupees(bw);
    setColorRupees(col);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedSuccess(false);

      const bwPaise = Math.round(parseFloat(bwRupees || "0") * 100);
      const colorPaise = Math.round(parseFloat(colorRupees || "0") * 100);
      const servicePaise = Math.round(parseFloat(serviceChargeRupees || "0") * 100);

      const updatedPricing: GlobalPricing = {
        bwPerSidePaise: bwPaise,
        colorPerSidePaise: colorPaise,
        paperSizeMultipliers: pricing.paperSizeMultipliers || {
          A4: 1.0,
          Letter: 1.0,
          A3: 2.0,
        },
        serviceChargePaise: servicePaise,
      };

      await set(ref(database, "pricing/global"), updatedPricing);
      setPricing(updatedPricing);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      alert(`Save pricing error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Pricing & Currency Rates
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure global per-page print rates. All transactions and balances calculate strictly in integer paise.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#0c831f] hover:bg-[#0a6e1a] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border-0 shrink-0 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Changes..." : "Save Pricing Rates"}</span>
        </button>
      </div>

      {/* Success Banner */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs sm:text-sm">Global Pricing Updated!</h4>
            <p className="text-xs text-emerald-700">
              New per-page rates have been saved to Firebase RTDB and broadcast live to all kiosks.
            </p>
          </div>
        </div>
      )}

      {/* ── Rate Presets ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-neutral-900">Campus Pricing Presets</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Quickly populate standard campus benchmarks or custom pricing policies:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleApplyPreset("1.50", "5.00")}
            className="p-3 rounded-xl border border-neutral-200 hover:border-[#0c831f] bg-neutral-50/50 hover:bg-emerald-50/30 text-left transition-all cursor-pointer"
          >
            <div className="font-bold text-xs text-neutral-900">Standard Campus (Default)</div>
            <div className="text-[11px] text-neutral-500 mt-1">₹1.50 B&W • ₹5.00 Color</div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset("1.00", "3.00")}
            className="p-3 rounded-xl border border-neutral-200 hover:border-[#0c831f] bg-neutral-50/50 hover:bg-emerald-50/30 text-left transition-all cursor-pointer"
          >
            <div className="font-bold text-xs text-neutral-900">Subsidized Student Rate</div>
            <div className="text-[11px] text-neutral-500 mt-1">₹1.00 B&W • ₹3.00 Color</div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset("2.00", "6.00")}
            className="p-3 rounded-xl border border-neutral-200 hover:border-[#0c831f] bg-neutral-50/50 hover:bg-emerald-50/30 text-left transition-all cursor-pointer"
          >
            <div className="font-bold text-xs text-neutral-900">Express / Commercial Rate</div>
            <div className="text-[11px] text-neutral-500 mt-1">₹2.00 B&W • ₹6.00 Color</div>
          </button>
        </div>
      </div>

      {/* ── Base Rates Per Printed Side ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Base Rates Per Printed Side</h2>
            <p className="text-xs text-neutral-500">Unit pricing charged per sheet side printed at any terminal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Black & White */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Black & White Rate (₹ per side)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={bwRupees}
                onChange={(e) => setBwRupees(e.target.value)}
                className="w-full h-11 pl-8 pr-4 bg-neutral-50 focus:bg-white rounded-xl border border-neutral-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 font-bold text-sm text-neutral-900 outline-none transition-all"
              />
            </div>
            <span className="text-[11px] text-neutral-500 block">
              Calculates strictly as <strong className="text-neutral-700">{Math.round(parseFloat(bwRupees || "0") * 100)} paise</strong> in backend
            </span>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Full Color Rate (₹ per side)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={colorRupees}
                onChange={(e) => setColorRupees(e.target.value)}
                className="w-full h-11 pl-8 pr-4 bg-neutral-50 focus:bg-white rounded-xl border border-neutral-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 font-bold text-sm text-neutral-900 outline-none transition-all"
              />
            </div>
            <span className="text-[11px] text-neutral-500 block">
              Calculates strictly as <strong className="text-neutral-700">{Math.round(parseFloat(colorRupees || "0") * 100)} paise</strong> in backend
            </span>
          </div>
        </div>

        {/* Service Charge */}
        <div className="pt-3 border-t border-neutral-100">
          <div className="max-w-sm space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Platform / Service Convenience Fee (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={serviceChargeRupees}
                onChange={(e) => setServiceChargeRupees(e.target.value)}
                className="w-full h-11 pl-8 pr-4 bg-neutral-50 focus:bg-white rounded-xl border border-neutral-200 focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 font-bold text-sm text-neutral-900 outline-none transition-all"
              />
            </div>
            <span className="text-[11px] text-neutral-400 block">
              Optional fixed fee per checkout order. Set to 0.00 for zero fee.
            </span>
          </div>
        </div>
      </div>

      {/* ── Paper Multipliers ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-neutral-700" />
          <h3 className="font-bold text-sm text-neutral-900">Paper Size Multipliers</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70 text-center">
            <span className="text-[11px] font-bold text-neutral-500 block uppercase">Standard A4</span>
            <span className="text-sm font-black text-neutral-900">1.0×</span>
          </div>
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70 text-center">
            <span className="text-[11px] font-bold text-neutral-500 block uppercase">Letter</span>
            <span className="text-sm font-black text-neutral-900">1.0×</span>
          </div>
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/70 text-center">
            <span className="text-[11px] font-bold text-neutral-500 block uppercase">Large A3</span>
            <span className="text-sm font-black text-neutral-900">2.0×</span>
          </div>
        </div>
      </div>
    </div>
  );
}
