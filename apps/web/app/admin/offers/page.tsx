"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Tabs,
  Tab,
} from "@heroui/react";
import { TicketPercent, Plus, Users, CheckCircle, Trash2 } from "lucide-react";
import { ref, onValue, set, remove } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { formatRupees, Offer, ReferralCode } from "@printmart/shared";

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [referrals, setReferrals] = useState<ReferralCode[]>([]);

  const {
    isOpen: isOfferOpen,
    onOpen: onOfferOpen,
    onOpenChange: onOfferOpenChange,
  } = useDisclosure();
  const {
    isOpen: isRefOpen,
    onOpen: onRefOpen,
    onOpenChange: onRefOpenChange,
  } = useDisclosure();

  // New Offer State
  const [code, setCode] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minOrderRupees, setMinOrderRupees] = useState<string>("5.00");
  const [maxDiscountRupees, setMaxDiscountRupees] = useState<string>("50.00");

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
      }
    });

    return () => {
      unsubOffers();
      unsubRef();
    };
  }, []);

  const handleCreateOffer = async (onClose: () => void) => {
    if (!code || !title) return;

    const offerId = `OFFER_${Date.now()}`;
    const newOffer: Offer = {
      offerId,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: "Admin configured offer",
      discountType,
      discountValue,
      minOrderPaise: Math.round(parseFloat(minOrderRupees || "0") * 100),
      maxDiscountPaise: Math.round(parseFloat(maxDiscountRupees || "0") * 100),
      minPages: 1,
      validFrom: Date.now(),
      validUntil: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
      globalUsageLimit: 500,
      perUserUsageLimit: 1,
      currentUsage: 0,
      applicableMachines: ["ALL"],
      active: true,
    };

    await set(ref(database, `offers/${offerId}`), newOffer);
    setCode("");
    setTitle("");
    onClose();
  };

  const handleCreateReferral = async (onClose: () => void) => {
    if (!refCode) return;

    const codeStr = refCode.trim().toUpperCase();
    const newRef: ReferralCode = {
      code: codeStr,
      ownerUid: "admin_pool",
      rewardPaise: 500,
      refereeDiscountPercent: refDiscount,
      totalConversions: 0,
      active: true,
      createdAt: Date.now(),
    };

    await set(ref(database, `referrals/${codeStr}`), newRef);
    setRefCode("");
    onClose();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Offers & Referral Campaigns</h1>
          <p className="text-sm text-neutral-500">Configure promotional coupons and referral rewards</p>
        </div>
      </div>

      <Tabs aria-label="Offers and Referrals" variant="underlined">
        <Tab key="offers" title="Promotional Coupons">
          <div className="flex flex-col gap-4 py-3">
            <div className="flex justify-end">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onOfferOpen}
              >
                Create Promo Coupon
              </Button>
            </div>

            <Card className="border border-neutral-200/80 shadow-none bg-white">
              <CardBody className="p-0">
                <Table aria-label="Coupons table" className="p-2">
                  <TableHeader>
                    <TableColumn>CODE & TITLE</TableColumn>
                    <TableColumn>DISCOUNT</TableColumn>
                    <TableColumn>MIN ORDER</TableColumn>
                    <TableColumn>USAGE</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                    <TableColumn>ACTION</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer.offerId}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-primary">{offer.code}</span>
                            <span className="text-xs text-neutral-500">{offer.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-neutral-900">
                            {offer.discountType === "PERCENTAGE"
                              ? `${offer.discountValue}% OFF`
                              : `${formatRupees(offer.discountValue)} FLAT`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-neutral-600">
                            {formatRupees(offer.minOrderPaise)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-neutral-600">
                            {offer.currentUsage} / {offer.globalUsageLimit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" color={offer.active ? "success" : "default"} variant="flat">
                            {offer.active ? "Active" : "Disabled"}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            color="danger"
                            onPress={() => remove(ref(database, `offers/${offer.offerId}`))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="referrals" title="Referral Codes">
          <div className="flex flex-col gap-4 py-3">
            <div className="flex justify-end">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onRefOpen}
              >
                Generate Referral Code
              </Button>
            </div>

            <Card className="border border-neutral-200/80 shadow-none bg-white">
              <CardBody className="p-0">
                <Table aria-label="Referrals table" className="p-2">
                  <TableHeader>
                    <TableColumn>REFERRAL CODE</TableColumn>
                    <TableColumn>DISCOUNT</TableColumn>
                    <TableColumn>CONVERSIONS</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((refItem) => (
                      <TableRow key={refItem.code}>
                        <TableCell>
                          <span className="font-mono text-sm font-bold text-neutral-900">
                            {refItem.code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-neutral-800">
                            {refItem.refereeDiscountPercent}% OFF
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-neutral-600">
                            {refItem.totalConversions} prints
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" color="success" variant="flat">
                            Active
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Create Coupon Modal */}
      <Modal isOpen={isOfferOpen} onOpenChange={onOfferOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Create New Promotional Coupon</ModalHeader>
              <ModalBody className="flex flex-col gap-3">
                <Input
                  label="Coupon Code"
                  placeholder="e.g. EXAM25"
                  value={code}
                  onValueChange={setCode}
                />
                <Input
                  label="Title"
                  placeholder="e.g. Exam Season 25% Discount"
                  value={title}
                  onValueChange={setTitle}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Discount Value"
                    type="number"
                    value={String(discountValue)}
                    onValueChange={(val) => setDiscountValue(parseInt(val, 10) || 0)}
                  />
                  <Input
                    label="Min Order (₹)"
                    value={minOrderRupees}
                    onValueChange={setMinOrderRupees}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleCreateOffer(onClose)}>
                  Create Coupon
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Create Referral Modal */}
      <Modal isOpen={isRefOpen} onOpenChange={onRefOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Create Referral Code</ModalHeader>
              <ModalBody className="flex flex-col gap-3">
                <Input
                  label="Referral Code"
                  placeholder="e.g. REF-STUDENT-20"
                  value={refCode}
                  onValueChange={setRefCode}
                />
                <Input
                  label="Referee Discount (%)"
                  type="number"
                  value={String(refDiscount)}
                  onValueChange={(val) => setRefDiscount(parseInt(val, 10) || 0)}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleCreateReferral(onClose)}>
                  Save Code
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

