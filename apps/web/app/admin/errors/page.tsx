"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
} from "@heroui/react";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { ref, onValue, update } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { ErrorLog } from "@printmart/shared";

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);

  useEffect(() => {
    const errorRef = ref(database, "errorLogs");
    const unsub = onValue(errorRef, (snap) => {
      if (snap.exists()) {
        const result: ErrorLog[] = [];
        const machinesMap = snap.val() as Record<string, Record<string, ErrorLog>>;
        Object.entries(machinesMap).forEach(([machineId, errs]) => {
          Object.values(errs).forEach((err) => {
            result.push({ ...err, machineId });
          });
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
    });
  };

  const markBypassed = async (machineId: string, errorId: string) => {
    await update(ref(database, `errorLogs/${machineId}/${errorId}`), {
      bypassed: true,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Hardware & Agent Error Monitoring</h1>
        <p className="text-sm text-neutral-500">
          Realtime diagnostic alerts from Windows print spoolers, connectivity, and kiosks
        </p>
      </div>

      <Card className="border border-neutral-200/80 shadow-none bg-white">
        <CardBody className="p-0">
          {errors.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
              <CheckCircle className="w-10 h-10 text-success" />
              <h3 className="text-base font-semibold text-neutral-900">All Systems Operational</h3>
              <p className="text-xs text-neutral-400">No active hardware or agent faults detected.</p>
            </div>
          ) : (
            <Table aria-label="Error logs table" className="p-2">
              <TableHeader>
                <TableColumn>TIMESTAMP</TableColumn>
                <TableColumn>MACHINE</TableColumn>
                <TableColumn>ERROR CODE</TableColumn>
                <TableColumn>SEVERITY</TableColumn>
                <TableColumn>DESCRIPTION</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>ACTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {errors.map((err) => (
                  <TableRow key={err.errorId}>
                    <TableCell>
                      <span className="text-xs text-neutral-500">
                        {new Date(err.timestamp).toLocaleTimeString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-neutral-800">
                        {err.machineId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-danger font-bold">{err.errorCode}</span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={
                          err.severity === "CRITICAL"
                            ? "danger"
                            : err.severity === "ERROR"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {err.severity}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-neutral-700">{err.description}</span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="dot"
                        color={err.resolved ? "success" : err.bypassed ? "warning" : "danger"}
                      >
                        {err.resolved ? "Resolved" : err.bypassed ? "Bypassed" : "Active"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {!err.resolved && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            color="success"
                            onPress={() => markResolved(err.machineId, err.errorId)}
                          >
                            Resolve
                          </Button>
                          {!err.bypassed && (
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => markBypassed(err.machineId, err.errorId)}
                            >
                              Bypass
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

