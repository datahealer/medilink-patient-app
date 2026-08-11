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

/** Leaflet/OSM clinic map with brand pins; tap a pin → clinic card → detail. */
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
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;background:#F9F4FA}.leaflet-control-attribution{font-size:8px}</style>
</head><body><div id="map"></div><script>
const RN = window.ReactNativeWebView;
const m = L.map('map',{zoomControl:false}).setView([23.6,58.4],11);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'© OSM © CARTO',maxZoom:18}).addTo(m);
const pin = L.divIcon({className:'',html:'<div style="width:26px;height:26px;border-radius:13px 13px 3px 13px;background:#2E1A47;border:2.5px solid #F9F4FA;box-shadow:0 3px 8px rgba(46,26,71,.4)"></div>',iconSize:[26,26],iconAnchor:[13,24]});
${markers}
</script></body></html>`;
  }, [clinics]);

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
