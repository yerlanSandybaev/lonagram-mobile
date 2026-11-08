import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// Height to lift a bottom composer by. Android resizes the window itself
// (softwareKeyboardLayoutMode "resize"), so only iOS needs the inset.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillChangeFrame", (event) => setInset(event.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardWillHide", () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}
