export function notificationRoute(href: string | null): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split("?")[0];
  const thread = /^\/(messages|twins)\/([0-9a-f-]{36})$/i.exec(path ?? "");
  if (thread)
    return `/${thread[1] === "messages" ? "chat" : "twin-chat"}/${thread[2]}`;
  if (path === "/home" || path === "/dating") return "/";
  return ["/notifications", "/settings", "/privacy"].includes(path ?? "")
    ? path!
    : null;
}
