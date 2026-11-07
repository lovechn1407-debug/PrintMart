"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Chip,
  Tabs,
  Tab,
  Divider,
} from "@heroui/react";
import { ShieldCheck, Printer, Wifi, ArrowLeft, RefreshCw, Wrench } from "lucide-react";
import { MachinePrinterStatus } from "@printmart/shared";

interface ConfigPanelScreenProps {
  machineId: string;
  onExit: () => void;
  onUpdateMachineId: (newId: string) => void;
}

export function ConfigPanelScreen({
  machineId,
  onExit,
  onUpdateMachineId,
}: ConfigPanelScreenProps) {
  const [printerTelemetry, setPrinterTelemetry] = useState<MachinePrinterStatus | null>(null);
  const [editedId, setEditedId] = useState<string>(machineId);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const kioskApi = (window as any).kioskApi;
    if (kioskApi?.getPrinterStatus) {
      kioskApi.getPrinterStatus().then((res: any) => setPrinterTelemetry(res));
    }
  }, []);

  const handleSaveId = () => {
    onUpdateMachineId(editedId);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center pb-4 border-b border-neutral-200 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-900 text-white rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Protected Kiosk Diagnostics & Setup</h1>
            <p className="text-xs text-neutral-500 font-mono">Terminal ID: {machineId} • Agent v1.0.0</p>
          </div>
        </div>
        <Button
          color="primary"
          size="sm"
          startContent={<ArrowLeft className="w-4 h-4" />}
          onPress={onExit}
        >
          Exit Diagnostics
        </Button>
      </div>

      <Tabs aria-label="Kiosk diagnostics tabs" variant="underlined">
        <Tab key="hardware" title="Hardware & Spooler">
          <div className="py-4 flex flex-col gap-4">
            <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
              <CardHeader className="p-0 mb-3 flex justify-between items-center">
                <span className="font-bold text-sm">Windows Print Spooler Telemetry</span>
                <Chip size="sm" color="success" variant="flat">
                  {printerTelemetry?.connection || "ONLINE"}
                </Chip>
              </CardHeader>
              <CardBody className="p-0 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Printer Name:</span>
                  <span className="font-bold">{printerTelemetry?.printerName || "Default Spooler"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Hardware State:</span>
                  <span className="font-semibold text-neutral-800">{printerTelemetry?.printerState || "READY"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Paper Status:</span>
                  <span>{printerTelemetry?.paperStatus || "OK"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Simulator Mode:</span>
                  <span>{printerTelemetry?.isSimulator ? "YES (Simulator Active)" : "NO (Live Spooler)"}</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="config" title="Terminal Configuration">
          <div className="py-4 flex flex-col gap-4">
            <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
              <CardHeader className="p-0 mb-3">
                <span className="font-bold text-sm">Vending Terminal Identity</span>
              </CardHeader>
              <CardBody className="p-0 flex flex-col gap-3">
                <Input
                  label="Configured Machine ID"
                  value={editedId}
                  onValueChange={setEditedId}
                />
                <Button size="sm" color="primary" onPress={handleSaveId}>
                  Update Terminal ID
                </Button>
                {savedSuccess && (
                  <span className="text-xs text-success font-medium">Terminal ID updated!</span>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}

