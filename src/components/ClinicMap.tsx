import React, { useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { pickLang, useI18n } from "@/i18n";
import type { Clinic } from "@/data/types";
import { AppText, Card, Icon, Rating } from "@/components/ui";

// react-native-webview has no web implementation — load it natively only.
const WebView =
  Platform.OS === "web"
    ? null
    : (require("react-native-webview").WebView as typeof import("react-native-webview").WebView);

/**
 * Google-cartography clinic map with medical-cross pins; tap a pin → clinic
 * card → detail. Omani patients know Google Maps, so the map must LOOK like
 * Google Maps (client feedback 2026-08-20): the prototype renders Google's
 * public raster tiles through Leaflet — no API key, instantly demoable in
 * Expo Go and on web. The production port should swap this WebView for
 * react-native-maps with PROVIDER_GOOGLE + a licensed API key.
 */
export function ClinicMap({ clinics }: { clinics: Clinic[] }) {
  const { colors, radii, isRTL, spacing, row } = useTheme();
  const { t } = useI18n();
  const [selected, setSelected] = useState<Clinic | null>(null);

  const html = useMemo(() => {
    const markers = clinics
      .map(
        (c) =>
          `L.marker([${c.latitude},${c.longitude}],{icon:pin}).addTo(m).on('click',()=>RN.postMessage(${JSON.stringify(c.id)}));`,
      )
      .join("\n");
    // Small clinic-style pin: brand-violet teardrop with a medical cross.
    const pinSvg =
      `<svg width="24" height="28" viewBox="0 0 24 28" style="filter:drop-shadow(0 2px 3px rgba(46,26,71,.45))">` +
      `<path d="M12 27C16.5 21.5 22 17 22 11A10 10 0 1 0 2 11c0 6 5.5 10.5 10 16z" fill="#2E1A47" stroke="#F9F4FA" stroke-width="1.6"/>` +
      `<path d="M10.4 5.6h3.2v3.5h3.5v3.2h-3.5v3.5h-3.2v-3.5H6.9V9.1h3.5z" fill="#F9F4FA"/>` +
      `</svg>`;
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;background:#F9F4FA}.leaflet-control-attribution{font-size:8px}</style>
</head><body><div id="map"></div><script>
const RN = window.ReactNativeWebView;
const m = L.map('map',{zoomControl:false}).setView([23.6,58.4],11);
L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${isRTL ? "ar" : "en"}',{subdomains:['mt0','mt1','mt2','mt3'],attribution:'© Google',maxZoom:20}).addTo(m);
const pin = L.divIcon({className:'',html:'${pinSvg}',iconSize:[24,28],iconAnchor:[12,27]});
${markers}
</script></body></html>`;
  }, [clinics, isRTL]);

  return (
    <View style={{ flex: 1, borderRadius: radii.lg, overflow: "hidden" }}>
      {Platform.OS === "web" ? (
        // Web preview: same Leaflet document in an iframe (marker taps are native-only).
        React.createElement("iframe", {
          srcDoc: html,
          style: { border: 0, width: "100%", height: "100%", flex: 1 },
        })
      ) : WebView ? (
        <WebView
          source={{ html }}
          originWhitelist={["*"]}
          onMessage={(e) => {
            const clinic = clinics.find((c) => c.id === e.nativeEvent.data);
            if (clinic) setSelected(clinic);
          }}
          style={{ flex: 1, backgroundColor: colors.background }}
        />
      ) : null}
      {selected ? (
        <View style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
          <Card onPress={() => router.push(`/clinics/${selected.id}`)}>
            <View style={{ flexDirection: row, alignItems: "center", gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Icon name="building" size={20} color="#2E1A47" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText role="cardTitle" weight="bold" numberOfLines={1}>
                  {pickLang(isRTL, selected.name, selected.name_ar)}
                </AppText>
                <View style={{ flexDirection: row, gap: 8, alignItems: "center" }}>
                  <Rating value={selected.rating} compact />
                  <AppText role="tiny" color={colors.textMuted}>
                    {pickLang(isRTL, selected.area, selected.area_ar)} · {t("common.km", { n: selected.distance_km })}
                  </AppText>
                </View>
              </View>
              <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.textFaint} />
            </View>
          </Card>
        </View>
      ) : null}
      {/* spacing token kept for parity with list padding */}
      <View style={{ height: 0, marginTop: spacing.xs }} />
    </View>
  );
}
