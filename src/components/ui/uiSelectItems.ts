import type { VNode } from "vue";

export type SelectGroupItem = {
  kind: "group";
  key: string;
  label: string;
};

export type SelectOptionItem = {
  kind: "option";
  key: string;
  optionIndex: number;
  value: string;
  label: string;
  disabled: boolean;
};

export type SelectItem = SelectGroupItem | SelectOptionItem;

function asText(children: unknown): string {
  if (children == null) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(asText).join("");
  if (typeof children === "object" && "children" in (children as Record<string, unknown>)) {
    return asText((children as any).children);
  }
  return "";
}

function pushOption(node: VNode, out: SelectItem[], optionIndex: number): number {
  const valueRaw = (node.props as any)?.value;
  const value = valueRaw == null ? "" : String(valueRaw);
  const label = asText(node.children);
  const disabled = Boolean((node.props as any)?.disabled);
  out.push({
    kind: "option",
    key: `${value}-${optionIndex}`,
    optionIndex,
    value,
    label: label || value,
    disabled,
  });
  return optionIndex + 1;
}

function parseNodes(nodes: unknown, out: SelectItem[], optionIndex: number): number {
  if (!nodes) return optionIndex;
  if (Array.isArray(nodes)) {
    let idx = optionIndex;
    for (const n of nodes) idx = parseNodes(n, out, idx);
    return idx;
  }
  if (typeof nodes !== "object") return optionIndex;

  const vnode = nodes as VNode;
  if (typeof vnode.type !== "string") {
    return parseNodes((vnode as any).children, out, optionIndex);
  }

  if (vnode.type === "option") return pushOption(vnode, out, optionIndex);
  if (vnode.type === "optgroup") {
    const label = String(((vnode.props as any)?.label ?? "").toString()).trim();
    if (label) out.push({ kind: "group", key: `group-${label}-${out.length}`, label });
    return parseNodes((vnode as any).children, out, optionIndex);
  }
  return parseNodes((vnode as any).children, out, optionIndex);
}

export function parseSelectItems(nodes: unknown): SelectItem[] {
  const out: SelectItem[] = [];
  parseNodes(nodes, out, 0);
  return out;
}

