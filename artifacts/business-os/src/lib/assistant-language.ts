export type AssistantLanguage = "english" | "hinglish";

const HINDI_LATIN_WORDS = new Set([
  "aap", "aapka", "aapki", "aapke", "abhi", "aur", "batao", "bataiye",
  "baaki", "banaye", "banao", "chahiye", "dikhao", "hai", "hain", "ho",
  "hoga", "hogi", "ka", "kaise", "kahan", "kab", "kar", "karna", "karo",
  "karun", "karu", "kese", "khatam", "kholo", "kitna", "kitne", "kitni",
  "kyu", "kyun", "liye", "mein", "mera", "meri", "mere", "mujhe", "naam",
  "nahi", "or", "par", "pe", "paisa", "paise", "raha", "rahe", "rahi",
  "sakta", "sakte", "sakti", "se", "tum", "tumhara", "tumhari", "tumhare",
  "unka", "unke", "unki", "wala", "wali", "wale", "ye", "yeh", "iska",
  "iski", "iske", "kya", "kis", "kisko", "jaisa", "jaise", "chalo",
  "milega", "kr", "krna", "krdo", "kro", "btao", "bta"
]);

export function detectAssistantLanguage(input: string): AssistantLanguage {
  if (/[\u0900-\u097F]/.test(input)) return "hinglish";
  const words = input.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = words.filter((word) => HINDI_LATIN_WORDS.has(word)).length;
  return hits > 0 ? "hinglish" : "english";
}

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/This answer is based on your current workspace data\.?/gi, "Yeh answer tumhare current workspace data par based hai."],
  [/What your data says/gi, "Tumhare data ke hisaab se"],
  [/Recommended next steps/gi, "Aage ke suggested steps"],
  [/No activity recorded this month/gi, "Is month abhi koi activity record nahi hui hai"],
  [/No marketing campaign metrics are recorded for the current month\.?/gi, "Is month ke marketing campaign metrics abhi record nahi hue hain."],
  [/Use this screen to/gi, "Is screen ka use"],
  [/Use the overview to/gi, "Overview ka use"],
  [/Keep your records accurate by/gi, "Records accurate rakhne ke liye"],
  [/from your saved records/gi, "tumhare saved records ke basis par"],
  [/in the current month/gi, "current month mein"],
  [/in the previous month/gi, "previous month mein"],
  [/versus the previous month/gi, "previous month ke comparison mein"],
  [/versus last month/gi, "last month ke comparison mein"],
  [/out of stock/gi, "stock khatam"],
  [/low stock/gi, "kam stock"],
  [/cash collected/gi, "collect hua cash"],
  [/customer balances outstanding/gi, "customers se pending amount"],
  [/supplier payments/gi, "supplier payments"],
  [/supplier payables/gi, "supplier ko pending payment"],
  [/average order value/gi, "average order value"],
  [/revenue target/gi, "revenue target"],
  [/business health/gi, "business ki health"],
  [/current workspace/gi, "current workspace"],
  [/saved records/gi, "saved records"],
  [/related module/gi, "related module"],
  [/date range/gi, "date range"],
  [/payment status/gi, "payment status"],
  [/pending payments/gi, "pending payments"],
  [/customer follow-up/gi, "customer follow-up"],
  [/next steps/gi, "next steps"],
];

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bacross\b/gi, "mein"],
  [/\bagainst\b/gi, "ke against"],
  [/\bversus\b/gi, "ke comparison mein"],
  [/\bremaining\b/gi, "baaki"],
  [/\boutstanding\b/gi, "pending"],
  [/\bpreviously\b/gi, "pichle period mein"],
  [/\bprevious\b/gi, "pichla"],
  [/\bavailable\b/gi, "available"],
  [/\bcurrently\b/gi, "abhi"],
  [/\bcurrently\b/gi, "abhi"],
  [/\bselect\b/gi, "select karo"],
  [/\bchoose\b/gi, "choose karo"],
  [/\bopen\b/gi, "open karo"],
  [/\breview\b/gi, "review karo"],
  [/\bcompare\b/gi, "compare karo"],
  [/\bupdate\b/gi, "update karo"],
  [/\bcheck\b/gi, "check karo"],
  [/\badd\b/gi, "add karo"],
  [/\brecord\b/gi, "record karo"],
  [/\bsave\b/gi, "save karo"],
  [/\bverify\b/gi, "verify karo"],
  [/\bcontact\b/gi, "contact karo"],
  [/\bprioritise\b/gi, "priority do"],
  [/\bprioritize\b/gi, "priority do"],
  [/\bmanage\b/gi, "manage karo"],
  [/\bcreate\b/gi, "create karo"],
  [/\buse\b/gi, "use karo"],
  [/\byour\b/gi, "tumhare"],
  [/\byou have\b/gi, "tumhare paas"],
  [/\bthe dashboard\b/gi, "dashboard"],
  [/\bthe business\b/gi, "business"],
  [/\bto track\b/gi, "track karne ke liye"],
  [/\bto start\b/gi, "start karne ke liye"],
  [/\bto see\b/gi, "dekhne ke liye"],
  [/\bto keep\b/gi, "maintain rakhne ke liye"],
  [/\bbefore\b/gi, "se pehle"],
  [/\bafter\b/gi, "ke baad"],
  [/\bwith\b/gi, "ke saath"],
  [/\bfrom\b/gi, "se"],
  [/\band\b/gi, "aur"],
];

export function toHinglish(value: string): string {
  let result = value;
  // Preserve exact figures while changing the sentence structure around them.
  result = result
    .replace(/Booked revenue:\s*(.+?)\s+across\s+(\d+) sales\./i, (_match: string, amount: string, count: string) => `Booked revenue ${amount} hai (${count} sales mein).`)
    .replace(/Cash collected:\s*(.+?); customer balances outstanding:\s*(.+?)\./i, (_match: string, collected: string, pending: string) => `Cash collected ${collected} hai; customers se pending amount ${pending} hai.`)
    .replace(/Average order value:\s*(.+?)\s+across\s+(\d+) orders\./i, (_match: string, amount: string, count: string) => `Average order value ${amount} hai (${count} orders ka average).`)
    .replace(/Units sold:\s*(\d+)\./i, (_match: string, count: string) => `Total ${count} units sell hue.`)
    .replace(/Customer receivables:\s*(.+?)\s+across\s+(\d+) unpaid or partially paid sales\./i, (_match: string, amount: string, count: string) => `Customers se pending payment ${amount} hai (${count} unpaid ya partial-payment sales mein).`)
    .replace(/Cash received this month:\s*(.+?)\s+from\s+(.+?)\s+in booked sales\./i, (_match: string, collected: string, booked: string) => `Is month receive hua cash ${collected} hai, total booked sales ${booked} mein se.`)
    .replace(/Collection ratio this month:\s*(.+?) of booked revenue\./i, (_match: string, ratio: string) => `Is month collection ratio ${ratio} hai (booked revenue ka).`)
    .replace(/(\d+) active products are in the catalogue\./i, (_match: string, count: string) => `Catalogue mein ${count} active products hain.`)
    .replace(/(\d+) products are out of stock and (\d+) are at or below minimum stock\./i, (_match: string, zero: string, low: string) => `${zero} products ka stock khatam hai aur ${low} products minimum stock level par ya usse neeche hain.`)
    .replace(/Out of stock:\s*(.+?)\./i, (_match: string, items: string) => `Stock khatam hai: ${items}.`)
    .replace(/Low stock:\s*(.+?)\./i, (_match: string, items: string) => `Stock kam hai: ${items}.`)
    .replace(/No unpaid customer sales are currently recorded\./i, "Abhi koi unpaid customer sale record nahi hai.")
    .replace(/Spend\s+(.+?); attributed revenue\s+(.+?)\./i, (_match: string, spend: string, revenue: string) => `Ad spend ${spend} hai; attributed revenue ${revenue} hai.`)
    .replace(/(\d+) impressions, (\d+) clicks, (\d+) leads and (\d+) attributed customers\./i, (_match: string, impressions: string, clicks: string, leads: string, customers: string) => `${impressions} impressions, ${clicks} clicks, ${leads} leads aur ${customers} attributed customers.`)
    .replace(/CTR:\s*(.+?); CPL:\s*(.+?); CAC:\s*(.+?)\./i, (_match: string, ctr: string, cpl: string, cac: string) => `CTR: ${ctr}; CPL: ${cpl}; CAC: ${cac}.`)
    .replace(/ROAS:\s*(.+?)\./i, (_match: string, roas: string) => `ROAS ${roas} hai.`)
    .replace(/(\d+) purchase records worth (.+?)\./i, (_match: string, count: string, total: string) => `${count} purchase records ki total value ${total} hai.`)
    .replace(/Paid to suppliers:\s*(.+?); outstanding:\s*(.+?)\s+across\s+(\d+) open purchases\./i, (_match: string, paid: string, pending: string, count: string) => `Suppliers ko paid amount ${paid} hai; ${count} open purchases mein ${pending} pending hai.`)
    .replace(/Supplier payment ratio:\s*(.+?)\./i, (_match: string, ratio: string) => `Supplier payment ratio ${ratio} hai.`);

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function assistantLabel(
  english: string,
  language: AssistantLanguage,
): string {
  if (language === "english") return english;
  const labels: Record<string, string> = {
    "Calculations": "Calculations",
    "Next steps": "Aage kya karein",
    "App guide": "App guide",
    "My business": "Mera business",
    "Your in-app guide": "Aapka in-app guide",
    "What are you trying to do?": "Aap kya karna chahte hain?",
    "Ask about your business": "Apne business ke baare mein poochhein",
    "Ask how to use this screen...": "Is screen ko use karne ke baare mein poochhein...",
    "Ask about your business...": "Apne business ke baare mein poochhein...",
    "Rules + workspace data": "Rules + workspace data",
    "Clear chat": "Chat clear karein",
  };
  return labels[english] ?? toHinglish(english);
}
