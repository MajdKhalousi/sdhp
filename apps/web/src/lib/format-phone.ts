export function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return '963' + digits.slice(1);
  if (digits.length === 9) return '963' + digits;
  return digits;
}

interface WhatsAppMessageParams {
  locale: string;
  patientName: string;
  doctorName: string;
  followUpDate: string;
  appointmentTime?: string;
}

export function buildWhatsAppMessage(p: WhatsAppMessageParams): string {
  if (p.locale === 'ar') {
    const timeText = p.appointmentTime ? ` الساعة ${p.appointmentTime}` : '';
    return (
      `مرحبًا ${p.patientName}، نذكّرك بموعد المراجعة مع الدكتور ${p.doctorName} بتاريخ ${p.followUpDate}${timeText}.\n` +
      `يرجى الحضور في الموعد المحدد.\n` +
      `لتأكيد الموعد، يرجى الرد بكلمة: أوافق\n` +
      `مع تمنياتنا لك بالصحة والعافية.`
    );
  }
  const timeText = p.appointmentTime ? ` at ${p.appointmentTime}` : '';
  return (
    `Hello ${p.patientName}, this is a reminder for your follow-up appointment with Dr. ${p.doctorName} on ${p.followUpDate}${timeText}.\n` +
    `Please arrive on time.\n` +
    `To confirm your appointment, please reply with: I confirm\n` +
    `We wish you good health.`
  );
}
