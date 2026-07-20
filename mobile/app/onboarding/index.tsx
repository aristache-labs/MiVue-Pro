import { Redirect, type Href } from "expo-router";

import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

/** Maps machine step → onboarding route. */
export default function OnboardingIndex() {
  const { ready, step, gateActive } = useOnboarding();

  if (!ready) return null;

  if (!gateActive && step === "completed") {
    return <Redirect href={"/(tabs)" as Href} />;
  }

  switch (step) {
    case "terms":
      return <Redirect href={"/onboarding/terms" as Href} />;
    case "cameraSetup":
      return <Redirect href={"/onboarding/add-camera" as Href} />;
    case "selectCamera":
      return <Redirect href={"/onboarding/select-camera" as Href} />;
    case "connectionGuide":
    case "connecting":
      return <Redirect href={"/onboarding/connect" as Href} />;
    case "success":
      return <Redirect href={"/onboarding/success" as Href} />;
    default:
      return <Redirect href={"/onboarding/terms" as Href} />;
  }
}
