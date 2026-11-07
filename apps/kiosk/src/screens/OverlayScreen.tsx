"use client";

import React from "react";
import { Card, CardHeader, CardBody, Chip, Button } from "@heroui/react";
import { AlertTriangle, Clock, Wrench } from "lucide-react";
import { MachineOverlay } from "@printmart/shared";

interface OverlayScreenProps {
  overlay: MachineOverlay;
  onOpenConfig: () => void;
}

export function OverlayScreen({ overlay, onOpenConfig }: OverlayScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full text-center">
      <Card className="w-full border border-neutral-200/80 shadow-none bg-white p-8">
        <CardHeader className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-warning/10 text-warning">
            <Wrench className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-neutral-900">{overlay.title}</h2>
            <Chip size="sm" color="warning" variant="flat" className="mt-2">
              {overlay.type}
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col items-center gap-4 py-4 text-sm text-neutral-600">
          <p>{overlay.message}</p>

          {overlay.countdownSeconds && (
            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700">
              <Clock className="w-4 h-4 text-primary" />
              <span>Estimated Return in {Math.round(overlay.countdownSeconds / 60)} minutes</span>
            </div>
          )}

          <Button size="sm" variant="light" className="text-neutral-400 mt-4" onPress={onOpenConfig}>
            Staff Maintenance Login
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

