"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Divider,
  Alert,
} from "@heroui/react";
import { Coins, Save, CheckCircle } from "lucide-react";
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedSuccess(false);

      // Convert rupees string to integer paise safely
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
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Save pricing error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Pricing Configuration</h1>
        <p className="text-sm text-neutral-500">
          Global page rates and print multipliers. Stored and calculated strictly in integer paise.
        </p>
      </div>

      {savedSuccess && (
        <Alert color="success" className="mb-2">
          Global pricing rates updated successfully!
        </Alert>
      )}

      <Card className="border border-neutral-200/80 shadow-none bg-white p-4">
        <CardHeader className="flex gap-3 items-center pb-2">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Base Rates Per Printed Side</h2>
            <p className="text-xs text-neutral-500">Single side unit pricing</p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Black & White Rate (₹)"
                description={`Stored as ${Math.round(parseFloat(bwRupees || "0") * 100)} paise`}
                value={bwRupees}
                onValueChange={setBwRupees}
              />
            </div>

            <div>
              <Input
                label="Full Color Rate (₹)"
                description={`Stored as ${Math.round(parseFloat(colorRupees || "0") * 100)} paise`}
                value={colorRupees}
                onValueChange={setColorRupees}
              />
            </div>
          </div>

          <Divider className="my-2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Base Service Charge (₹)"
                description="Optional per-order convenience fee"
                value={serviceChargeRupees}
                onValueChange={setServiceChargeRupees}
              />
            </div>
          </div>
        </CardBody>

        <CardFooter className="border-t border-neutral-100 pt-4 flex justify-end">
          <Button
            color="primary"
            startContent={<Save className="w-4 h-4" />}
            isLoading={saving}
            onPress={handleSave}
          >
            Save Pricing Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

