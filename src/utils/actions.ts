import { Linking } from "react-native";

/**
 * Directions — prefer the Google Maps app when installed, otherwise the
 * universal maps URL (which itself opens the G-Maps app via app-link when
 * present, or the browser as a last resort).
 */
export async function openDirections(lat: number, lng: number) {
  const appUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  try {
    if (await Linking.canOpenURL(appUrl)) return await Linking.openURL(appUrl);
  } catch {
    // scheme not queryable — fall through to the universal link
  }
  return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

/** Share a short text through WhatsApp (app first, wa.me fallback). */
export async function shareWhatsApp(text: string) {
  const encoded = encodeURIComponent(text);
  const appUrl = `whatsapp://send?text=${encoded}`;
  try {
    if (await Linking.canOpenURL(appUrl)) return await Linking.openURL(appUrl);
  } catch {
    // fall through
  }
  return Linking.openURL(`https://wa.me/?text=${encoded}`);
}

/** Open a WhatsApp chat with a specific number (support line). */
export async function chatWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const appUrl = `whatsapp://send?phone=${digits}`;
  try {
    if (await Linking.canOpenURL(appUrl)) return await Linking.openURL(appUrl);
  } catch {
    // fall through
  }
  return Linking.openURL(`https://wa.me/${digits}`);
}

export function openTel(phone: string) {
  return Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
}

export function openMail(address: string) {
  return Linking.openURL(`mailto:${address}`);
}
