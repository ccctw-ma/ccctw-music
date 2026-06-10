import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ccctw.music",
  appName: "CCCTW Music",
  webDir: "../web/dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
