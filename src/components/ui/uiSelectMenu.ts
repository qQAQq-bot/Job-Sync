export const LISTBOX_MAX_HEIGHT_PX = 288;
export const VIEWPORT_PADDING_PX = 12;
export const MENU_MARGIN_PX = 8;

export type MenuPlacement = "bottom" | "top";

export type MenuStyle = {
  left: string;
  top: string;
  width: string;
};

export type MenuLayout = {
  placement: MenuPlacement;
  menuMaxHeight: number | null;
  menuStyle: MenuStyle;
};

export function focusWithoutScroll(target: { focus: (options?: FocusOptions) => void } | null | undefined): void {
  target?.focus({ preventScroll: true });
}

export function measureMenuLayout(button: HTMLElement, menu: HTMLElement): MenuLayout {
  const buttonRect = button.getBoundingClientRect();
  const menuContentHeight = menu.scrollHeight;
  const spaceBelow = window.innerHeight - buttonRect.bottom - VIEWPORT_PADDING_PX - MENU_MARGIN_PX;
  const spaceAbove = buttonRect.top - VIEWPORT_PADDING_PX - MENU_MARGIN_PX;
  const placement: MenuPlacement = spaceBelow < menuContentHeight && spaceAbove > spaceBelow ? "top" : "bottom";
  const maxSpace = placement === "top" ? Math.max(0, spaceAbove) : Math.max(0, spaceBelow);
  const menuMaxHeight = Math.min(LISTBOX_MAX_HEIGHT_PX, Math.floor(maxSpace));
  const renderedHeight = Math.min(menuContentHeight, menuMaxHeight || menuContentHeight);
  const top = placement === "top"
    ? Math.max(VIEWPORT_PADDING_PX, Math.round(buttonRect.top - renderedHeight - MENU_MARGIN_PX))
    : Math.round(buttonRect.bottom + MENU_MARGIN_PX);

  return {
    placement,
    menuMaxHeight,
    menuStyle: {
      left: `${Math.round(buttonRect.left)}px`,
      top: `${top}px`,
      width: `${Math.round(buttonRect.width)}px`,
    },
  };
}
