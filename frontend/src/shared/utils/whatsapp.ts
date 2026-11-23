export function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Numbers are entered locally in this Egypt-based system; make local mobile
  // numbers usable by WhatsApp while preserving an already supplied country code.
  if (digits.startsWith('0') && digits.length >= 10) digits = `20${digits.slice(1)}`;
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
