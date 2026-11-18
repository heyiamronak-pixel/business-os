export type ReportRecordType = "sale" | "expense" | "purchase" | "campaign";

export interface ReportFilterRecord {
  id: string;
  recordType: ReportRecordType;
  amount: number;
  status: string;
  paymentMethod: string;
  category: string;
  contact: string;
  details: string;
  productIds: string[];
}

export interface ReportFilters {
  recordTypes: ReportRecordType[];
  productIds: string[];
  statuses: string[];
  paymentMethods: string[];
  categories: string[];
  contactQuery: string;
  minAmount: string;
  maxAmount: string;
}

export function emptyReportFilters(): ReportFilters {
  return {
    recordTypes: [],
    productIds: [],
    statuses: [],
    paymentMethods: [],
    categories: [],
    contactQuery: "",
    minAmount: "",
    maxAmount: "",
  };
}

export function activeReportFilterCount(filters: ReportFilters): number {
  return filters.recordTypes.length +
    filters.productIds.length +
    filters.statuses.length +
    filters.paymentMethods.length +
    filters.categories.length +
    Number(filters.contactQuery.trim().length > 0) +
    Number(filters.minAmount.trim().length > 0) +
    Number(filters.maxAmount.trim().length > 0);
}

/** Multi-select values are ORed within a group; different groups are combined with AND. */
export function matchesReportFilters(record: ReportFilterRecord, filters: ReportFilters): boolean {
  if (filters.recordTypes.length > 0 && !filters.recordTypes.includes(record.recordType)) return false;
  if (filters.productIds.length > 0 && !record.productIds.some((id) => filters.productIds.includes(id))) return false;
  if (filters.statuses.length > 0 && !filters.statuses.includes(record.status)) return false;
  if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(record.paymentMethod)) return false;
  if (filters.categories.length > 0 && !filters.categories.includes(record.category)) return false;

  const contactQuery = filters.contactQuery.trim().toLocaleLowerCase();
  if (contactQuery && !record.contact.toLocaleLowerCase().includes(contactQuery)) return false;

  if (filters.minAmount.trim()) {
    const min = Number(filters.minAmount);
    if (!Number.isFinite(min) || record.amount < min) return false;
  }
  if (filters.maxAmount.trim()) {
    const max = Number(filters.maxAmount);
    if (!Number.isFinite(max) || record.amount > max) return false;
  }
  return true;
}

export function filterReportRecords<T extends ReportFilterRecord>(
  records: T[],
  filters: ReportFilters,
): T[] {
  return records.filter((record) => matchesReportFilters(record, filters));
}
