import { Destination } from "@/components/destination";

export default function NotificationsScreen() {
  return (
    <Destination
      body="Connection requests and twin updates will show up here."
      detail="Notifications stay on your Lonagram account. This version does not mark them read."
      title="Notifications"
    />
  );
}
