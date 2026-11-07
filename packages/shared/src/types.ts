export type UserRole = "customer" | "admin";
export type AccountStatus = "active" | "suspended";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  stats: {
    totalDocuments: number;
    totalPages: number;
    totalSpentPaise: number;
  };
  createdAt: number;
  lastLoginAt: number;
}

export type MachineConnectionStatus =
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "MAINTENANCE"
  | "DISABLED"
  | "ERROR";

export interface MachineRecord {
  machineId: string;
  name: string;
  location: string;
  pairedAt: number;
  pairingStatus: "paired" | "pending" | "revoked";
  status: MachineConnectionStatus;
  lastHeartbeat: number;
  agentVersion: string;
  ipAddress?: string;
  masterCodeHash?: string;
  pricingOverride?: {
    enabled: boolean;
    bwPerSidePaise: number;
    colorPerSidePaise: number;
  };
}

export interface MachineCapabilities {
  machineId: string;
  colorSupported: boolean;
  duplexSupported: boolean;
  supportedPaperSizes: string[];
  maxPagesPerJob: number;
  hardwareType: string;
  telemetrySupported: {
    tonerLevel: boolean;
    paperStatus: boolean;
    exactPageCounter: boolean;
  };
}

export type PrinterHardwareState =
  | "READY"
  | "PRINTING"
  | "PAPER_JAM"
  | "OUT_OF_PAPER"
  | "TONER_LOW"
  | "ERROR"
  | "UNKNOWN";

export type PaperStatus = "OK" | "LOW" | "EMPTY" | "NOT_SUPPORTED";

export interface TonerLevels {
  blackPercent: number | null;
  cyanPercent: number | null;
  magentaPercent: number | null;
  yellowPercent: number | null;
}

export interface MachinePrinterStatus {
  printerName: string;
  connection: "ONLINE" | "OFFLINE" | "DISCONNECTED";
  printerState: PrinterHardwareState;
  paperStatus: PaperStatus;
  tonerLevels: TonerLevels;
  currentSpoolerJobId?: number | null;
  isSimulator?: boolean;
  updatedAt: number;
}

export type MachineAction =
  | "RESTART_AGENT"
  | "ENABLE"
  | "DISABLE"
  | "REFRESH_STATUS"
  | "CLEAR_ERROR"
  | "TRIGGER_MAINTENANCE"
  | "REPRINT_JOB";

export interface MachineCommand {
  commandId: string;
  action: MachineAction;
  payload?: Record<string, any>;
  status: "PENDING" | "ACKNOWLEDGED" | "EXECUTED" | "FAILED";
  issuedBy: string;
  issuedAt: number;
  executedAt?: number | null;
  result?: string | null;
}

export interface DocumentMetadata {
  documentId: string;
  ownerUid: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  pageCount: number;
  telegramMessageId?: number;
  telegramFileId?: string;
  retentionExpiresAt: number;
  createdAt: number;
}

export type ColorMode = "bw" | "color";
export type SimplexDuplex = "simplex" | "duplex";

export interface PrintJobConfiguration {
  colorMode: ColorMode;
  simplexDuplex: SimplexDuplex;
  paperSize: string;
  copies: number;
  pageRange: string;
  selectedPages: number[];
  totalPagesToPrint: number;
}

export interface PricingBreakdown {
  baseRatePaise: number;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  finalPayablePaise: number;
  offerCode?: string | null;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

export type PreparationStatus =
  | "CREATED"
  | "PRELOAD_QUEUED"
  | "DOWNLOADING"
  | "VERIFYING"
  | "CONVERTING"
  | "READY"
  | "PRELOAD_FAILED";

export type PrintingStatus =
  | "QUEUED"
  | "AUTHORIZED"
  | "SPOOLING"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED";

export interface PrintJob {
  jobId: string;
  userId: string;
  machineId: string;
  documentId: string;
  documentName: string;
  orderId: string;
  configuration: PrintJobConfiguration;
  pricing: PricingBreakdown;
  payment: {
    status: PaymentStatus;
    cfOrderId?: string;
    cfPaymentId?: string;
    paidAt?: number;
  };
  preparation: {
    status: PreparationStatus;
    cachedFilePath?: string;
    preloadStartedAt?: number;
    preloadCompletedAt?: number;
    errorMessage?: string | null;
  };
  printing: {
    status: PrintingStatus;
    spoolerJobId?: number | null;
    printedPages: number;
    startedAt?: number | null;
    completedAt?: number | null;
    failureReason?: string | null;
  };
  otpHash: string;
  otpExpiresAt: number;
  otpConsumed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OTPRecord {
  jobId: string;
  machineId: string;
  userId: string;
  otpHash: string;
  expiresAt: number;
  failedAttempts: number;
  consumed: boolean;
  createdAt: number;
}

export interface GlobalPricing {
  bwPerSidePaise: number;
  colorPerSidePaise: number;
  paperSizeMultipliers: Record<string, number>;
  serviceChargePaise: number;
}

export type DiscountType = "PERCENTAGE" | "FLAT";

export interface Offer {
  offerId: string;
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderPaise: number;
  maxDiscountPaise: number;
  minPages: number;
  validFrom: number;
  validUntil: number;
  globalUsageLimit: number;
  perUserUsageLimit: number;
  currentUsage: number;
  applicableMachines: string[];
  active: boolean;
}

export interface ReferralCode {
  code: string;
  ownerUid: string;
  rewardPaise: number;
  refereeDiscountPercent: number;
  totalConversions: number;
  active: boolean;
  createdAt: number;
}

export type OverlayType =
  | "NONE"
  | "MAINTENANCE"
  | "SERVICE_DISABLED"
  | "PAPER_OUT"
  | "NETWORK_MAINTENANCE"
  | "CUSTOM";

export interface MachineOverlay {
  active: boolean;
  type: OverlayType;
  title: string;
  message: string;
  countdownSeconds?: number | null;
  updatedAt: number;
}

export type ErrorSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface ErrorLog {
  errorId: string;
  machineId: string;
  errorCode: string;
  severity: ErrorSeverity;
  description: string;
  diagnosticData?: Record<string, any>;
  timestamp: number;
  resolved: boolean;
  bypassed: boolean;
}

export interface AuditLog {
  logId: string;
  actorUid: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  timestamp: number;
}
