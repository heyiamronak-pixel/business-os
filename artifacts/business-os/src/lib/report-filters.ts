export type ReportRecordType = "sale" | "expense" | "purchase" | "campaign";
export type ReportFilterField =
  | "recordType"
  | "amount"
  | "status"
  | "paymentMethod"
  | "category"
  | "contact"
  | "details";
export type ReportFilterOperator = "equals" | "contains" | "greater_than" | "less_than";
export type ReportFilterLogic = "all" | "any";

export interface ReportFilterRule {
  id: string;
  field: ReportFilterField;
  operator: ReportFilterOperator;
  value: string;
}

export interface ReportFilterRecord {
  id: string;
  recordType: ReportRecordType;
  amount: number;
  status: string;
  paymentMethod: string;
  category: string;
  contact: string;
  details: string;
}

export function matchesReportFilters(
  record: ReportFilterRecord,
  rules: ReportFilterRule[],
  logic: ReportFilterLogic = "all",
): boolean {
  const activeRules = rules.filter((rule) => rule.value.trim().length > 0);
  if (activeRules.length === 0) return true;

  const matches = activeRules.map((rule) => {
    if (rule.field === "amount") {
      const expected = Number(rule.value);
      if (!Number.isFinite(expected)) return false;
      if (rule.operator === "greater_than") return record.amount > expected;
      if (rule.operator === "less_than") return record.amount < expected;
      return record.amount === expected;
    }

    const actual = String(record[rule.field] ?? "").trim().toLocaleLowerCase();
    const expected = rule.value.trim().toLocaleLowerCase();
    return rule.operator === "contains" ? actual.includes(expected) : actual === expected;
  });

  return logic === "all" ? matches.every(Boolean) : matches.some(Boolean);
}

export function filterReportRecords<T extends ReportFilterRecord>(
  records: T[],
  rules: ReportFilterRule[],
  logic: ReportFilterLogic = "all",
): T[] {
  return records.filter((record) => matchesReportFilters(record, rules, logic));
}
