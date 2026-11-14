type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }
  return { apiKey, from };
}

/**
 * Send transactional account emails without logging tokens or full message bodies.
 * The caller should handle failures without exposing provider responses to users.
 */
export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  const { apiKey, from } = getResendConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const providerStatus = response.status;
    throw new Error(`Transactional email delivery failed (HTTP ${providerStatus}).`);
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}
