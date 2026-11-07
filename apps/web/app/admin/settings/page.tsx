"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Chip,
  Divider,
} from "@heroui/react";
import { Settings, ShieldCheck, Database, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState<number>(25);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">System & Vault Settings</h1>
        <p className="text-sm text-neutral-500">Global retention policies and external integration telemetry</p>
      </div>

      <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
        <CardHeader className="flex gap-3 items-center pb-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Document Retention & Storage</h2>
            <p className="text-xs text-neutral-500">Configured Telegram private channel vault</p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Document Retention (Days)"
              type="number"
              value={String(retentionDays)}
              onValueChange={(val) => setRetentionDays(parseInt(val, 10) || 7)}
              description="Temporary spool files auto-shredded after expiry"
            />
            <Input
              label="Maximum Upload Size (MB)"
              type="number"
              value={String(maxFileSizeBytes)}
              onValueChange={(val) => setMaxFileSizeBytes(parseInt(val, 10) || 25)}
            />
          </div>

          <Divider className="my-2" />

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Connected Integration Status</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="font-semibold text-neutral-800 block">Telegram Document Vault</span>
                  <span className="text-neutral-500">Channel ID: -1004357170113 • Bot API Active</span>
                </div>
                <Chip size="sm" color="success" variant="flat">
                  CONNECTED
                </Chip>
              </div>

              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="font-semibold text-neutral-800 block">Cashfree Payment Gateway</span>
                  <span className="text-neutral-500">Mode: SANDBOX • Merchant App ID: TEST10342...</span>
                </div>
                <Chip size="sm" color="primary" variant="flat">
                  SANDBOX DEMO
                </Chip>
              </div>

              <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                <div>
                  <span className="font-semibold text-neutral-800 block">Firebase Realtime Database</span>
                  <span className="text-neutral-500">Project: printmart-bd9da • Node: /printmart-bd9da-default-rtdb</span>
                </div>
                <Chip size="sm" color="success" variant="flat">
                  LIVE SYNC
                </Chip>
              </div>
            </div>
          </div>
        </CardBody>

        <CardFooter className="border-t border-neutral-100 pt-4 flex justify-end">
          <Button color="primary" startContent={<Save className="w-4 h-4" />}>
            Save System Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

