import { router, type Href } from "expo-router";

/**
 * Dismiss/back without throwing the Android Expo Go “GO_BACK was not handled” warning
 * when the stack has no history (deep link, fullScreenModal, replace-based flows).
 */
export function safeRouterBack(fallbackHref: Href = "/(tabs)" as Href): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref);
}

/**
 * Leave a presented modal (e.g. Player fullScreenModal), then open a root stack route
 * so it is not nested as a card/sheet on top of the modal.
 */
export function navigateAfterDismissingModal(href: Href): void {
  if (router.canDismiss()) {
    router.dismiss();
    queueMicrotask(() => {
      router.push(href);
    });
    return;
  }
  router.push(href);
}
