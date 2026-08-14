/**
 * A minimal hyperscript helper.
 *
 * The whole UI is hand-rolled DOM rather than a framework: the app has one
 * route, a dozen screens and no shared reactive state worth diffing, so a
 * framework would be pure payload.
 */

type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  text?: string;
  /** Only ever used with strings this module authors — never user input. */
  html?: string;
  [key: string]: unknown;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;

      if (key === 'class') el.className = String(value);
      else if (key === 'text') el.textContent = String(value);
      else if (key === 'html') el.innerHTML = String(value);
      else if (key === 'style' && typeof value === 'string') el.setAttribute('style', value);
      else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
  }

  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/** SVG needs namespaced creation, so it gets its own constructor. */
export function svg(tag: string, attrs: Record<string, string | number> = {}, ...children: Node[]): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  for (const child of children) el.appendChild(child);
  return el;
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Buckets text length so CSS can step the type size down instead of overflowing. */
export function lengthClass(text: string, threshold = 92): 'normal' | 'long' {
  return text.length > threshold ? 'long' : 'normal';
}
