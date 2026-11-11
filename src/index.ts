// editorjs-text-picture: text beside a picture, on the left or the right.
import type { API, BlockTool, BlockToolConstructorOptions } from '@editorjs/editorjs';
import { el, imageField, normalizeImage, type ImageConfig, type ToolImage } from './image';
import { setInline } from './inline';

export type { ImageConfig, ToolImage } from './image';
export interface TextPictureData { text: string; image: ToolImage | null; side: 'left' | 'right' }

/** Fills defaults (side right) and drops unknown top-level keys. */
export function normalize(data: unknown): TextPictureData {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return { text: typeof o.text === 'string' ? o.text : '', image: normalizeImage(o.image), side: o.side === 'left' ? 'left' : 'right' };
}

/** True when there is text and a picture with a description. */
export const isValid = (d: TextPictureData) => !!d.text.replace(/<[^>]*>/g, '').trim() && !!d.image && d.image.alt.trim() !== '';
/** True when there is neither text nor a picture (the only block `validate` refuses). */
export const isEmpty = (d: TextPictureData) => !d.text.replace(/<[^>]*>/g, '').trim() && !d.image;

export default class TextPictureTool implements BlockTool {
  private data: TextPictureData;
  private root = el('div', 'ejs-text-picture');
  constructor(private opts: BlockToolConstructorOptions<TextPictureData, ImageConfig>) {
    this.data = normalize(opts.data);
  }
  static get toolbox() {
    return { title: 'Text and picture', icon: '<svg width="17" height="15" viewBox="0 0 17 15"><path d="M1 3h6M1 7h6M1 11h6" stroke="currentColor" stroke-width="1.6"/><rect x="9" y="2" width="7" height="10" rx="1.5" fill="currentColor"/></svg>' };
  }
  static get isReadOnlySupported() { return true; }
  // only the inline styles (bold, italic, underline, strike, sup, sub, highlight, code) and links survive a paste or a save in the text; side and picture are kept as they are
  // (`false` would HTML-escape them, and a key with no rule gets its parent's rule)
  static get sanitize() { return { text: { b: true, i: true, u: true, s: true, sup: true, sub: true, mark: true, code: true, a: { href: true } }, side: true, image: true }; }

  render(): HTMLElement {
    // typing in an input changes no DOM node, so Editor.js is told
    this.root.addEventListener('input', () => this.opts.block.dispatchChange());
    this.draw();
    return this.root;
  }
  save(): TextPictureData { return this.data; }
  // Editor.js drops a block that fails validate from the save: only an empty one, so a half-made one reaches the host
  validate(data: TextPictureData) { return !isEmpty(normalize(data)); }

  renderSettings() {
    return (['left', 'right'] as const).map((side) => ({
      icon: side === 'left' ? '◧' : '◨', title: side === 'left' ? 'Picture on the left' : 'Picture on the right',
      isActive: this.data.side === side, closeOnActivate: true,
      onActivate: () => { this.data.side = side; this.root.dataset.side = side; },
    }));
  }

  private draw() {
    const ro = (this.opts.api as API).readOnly.isEnabled;
    this.root.replaceChildren();
    this.root.dataset.side = this.data.side;
    const text = el('div', 'ejs-text-picture-text');
    text.contentEditable = String(!ro);
    text.dataset.placeholder = 'Text';
    setInline(text, this.data.text);
    text.oninput = () => { this.data.text = text.innerHTML; };
    // the keys that would split or merge the block belong to the text while it is being edited
    text.onkeydown = (e) => { if (e.key === 'Enter' || e.key === 'Backspace') e.stopPropagation(); };
    const pic = imageField({ value: this.data.image, config: this.opts.config ?? {}, api: this.opts.api as API, onChange: (v) => { this.data.image = v; } });
    pic.classList.add('ejs-text-picture-pic');
    this.root.append(text, pic);
  }
}
