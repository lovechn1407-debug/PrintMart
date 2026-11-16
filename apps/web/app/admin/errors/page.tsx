"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Filter,
} from "lucide-react";
import { ref, onValue, update, remove } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { ErrorLog } from "@printmart/shared";

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");

  useEffect(() => {
    const errorRef = ref(database, "errorLogs");
    const unsub = onValue(errorRef, (snap) => {
      if (snap.exists()) {
        const result: ErrorLog[] = [];
        const machinesMap = snap.val() as Record<string, Record<string, ErrorLog>>;
        Object.entries(machinesMap).forEach(([machineId, errs]) => {
          if (errs && typeof errs === "object") {
            Object.values(errs).forEach((err) => {
              if (err && typeof err === "object") {
                result.push({ ...err, machineId });
              }
            });
          }
        });
        setErrors(result.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setErrors([]);
      }
    });

    return () => unsub();
  }, []);

  const markResolved = async (machineId: string, errorId: string) => {
    await update(ref(database, `errorLogs/${machineId}/${errorId}`), {
      resolved: true,
      resolvedAt: Date.now(),
    });
  };

  const markBypassed = async (machineId: string, errorId: string) => {
    await update(ref(database, `errorLogs/${machineId}/${errorId}`), {
      bypassed: true,
      bypassedAt: Date.now(),
    });
  };

  const clearResolvedLogs = async () => {
    if (!confirm("Are you sure you want to remove all resolved error logs?")) return;
    const resolvedErrors = errors.filter((e) => e.resolved);
    for (const err of resolvedErrors) {
      if (err.machineId && err.errorId) {
        await remove(ref(database, `errorLogs/${err.machineId}/${err.errorId}`));
      }
    }
  };

  const filteredErrors = errors.filter((e) => {
    if (filterStatus === "ACTIVE") return !e.resolved;
    if (filterStatus === "RESOLVED") return Boolean(e.resolved);
    return true;
  });

  const activeErrors = errors.filter((e) => !e.resolved);
  const criticalCount = activeErrors.filter((e) => e.severity === "CRITICAL").length;

  return (
    <div className="flex flex-col gap-6 max-w-6xl font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Hardware & Spooler Error Monitoring
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Realtime diagnostic alerts from Windows print spoolers, hardware sensors, and kiosk connectivity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {errors.some((e) => e.resolved) && (
            <button
              type="button"
              onClick={clearResolvedLogs}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold border border-neutral-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Resolved Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Active Faults
            </span>
            <span className="text-2xl font-black text-neutral-900">{activeErrors.length}</span>
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeErrors.length > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-[#0c831f]"
            }`}
          >
            {activeErrors.length > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Critical Alerts
            </span>
            <span className="text-2xl font-black text-rose-600">{criticalCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Resolved Issues
            </span>
            <span className="text-2xl font-black text-emerald-700">
              {errors.filter((e) => e.resolved).length}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-1 p-1 bg-neutral-200/70 rounded-xl w-fit">
        {(["ALL", "ACTIVE", "RESOLVED"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterStatus(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
              filterStatus === tab
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {tab === "ALL" ? `All Logs (${errors.length})` : tab === "ACTIVE" ? `Active Faults (${activeErrors.length})` : `Resolved (${errors.filter((e) => e.resolved).length})`}
          </button>
        ))}
      </div>

      {/* ── Error Logs Table ── */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Kiosk ID</th>
                <th className="py-3 px-4">Error Code</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredErrors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      <h4 className="font-bold text-neutral-900 text-sm">All Hardware Operational</h4>
                      <p className="text-xs text-neutral-500">No active hardware faults or spooler errors detected.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredErrors.map((err) => (
                  <tr key={err.errorId} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4 text-neutral-500">
                      {err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : "—"}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                      {err.machineId}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {err.errorCode}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          err.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : err.severity === "ERROR"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {err.severity}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-700 max-w-sm">
                      {err.description}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          err.resolved
                            ? "bg-emerald-100 text-emerald-800"
                            : err.bypassed
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800 animate-pulse"
                        }`}
                      >
                        {err.resolved ? "Resolved" : err.bypassed ? "Bypassed" : "Active Fault"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {!err.resolved && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => markResolved(err.machineId, err.errorId)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border-0"
                          >
                            Mark Resolved
                          </button>
                          {!err.bypassed && (
                            <button
                              type="button"
                              onClick={() => markBypassed(err.machineId, err.errorId)}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border-0"
                            >
                              Bypass
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
