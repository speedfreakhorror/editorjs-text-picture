// src/image.ts
var P = "ejs-text-picture";
var isError = (r) => typeof r.error === "string";
function normalizeImage(v) {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return null;
  const o = v;
  if (typeof o.url !== "string" || !o.url || typeof o.width !== "number" || typeof o.height !== "number")
    return null;
  return { ...o, url: o.url, width: o.width, height: o.height, alt: typeof o.alt === "string" ? o.alt : "" };
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined)
    e.textContent = text;
  return e;
}
function imageField(opts) {
  const { config, api, onChange } = opts;
  let img = opts.value;
  const root = el("div", `${P}-field`);
  const note = el("div", `${P}-error`);
  note.setAttribute("role", "alert");
  const fail = (m) => {
    note.textContent = m;
  };
  const set = (v) => {
    img = v;
    onChange(v);
    draw();
  };
  const run = async (btn, job) => {
    btn.disabled = true;
    try {
      await job();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      btn.disabled = false;
    }
  };
  const button = (label, onClick) => {
    const b = el("button", `${P}-btn`, label);
    b.type = "button";
    b.onclick = () => onClick(b);
    return b;
  };
  function draw() {
    root.replaceChildren();
    if (img) {
      const pic = el("img", `${P}-img`);
      pic.src = img.url;
      pic.alt = img.alt;
      root.append(pic);
    } else
      root.append(el("div", `${P}-empty`, "No picture yet"));
    const bar = el("div", `${P}-bar`);
    if (!api.readOnly.isEnabled) {
      if (config.uploader) {
        const up = config.uploader;
        const file = el("input", `${P}-file`);
        file.type = "file";
        file.accept = "image/*";
        file.hidden = true;
        file.onchange = () => {
          const f = file.files?.[0];
          file.value = "";
          if (f)
            run(pick, async () => {
              const r = await up(f);
              if (isError(r))
                return fail(r.error);
              set({ ...r, alt: img?.alt ?? "" });
            });
        };
        const pick = button(img ? "Replace picture" : "Upload picture", () => file.click());
        bar.append(file, pick);
      }
      for (const s of config.sources ?? []) {
        bar.append(button(s.label, (b) => void run(b, async () => {
          const r = await s.pick();
          if (r)
            set({ ...r, alt: r.alt ?? img?.alt ?? "" });
        })));
      }
      if (img) {
        for (const a of config.actions ?? []) {
          if (!a.show(img))
            continue;
          bar.append(button(a.label, (b) => void run(b, async () => {
            const r = await a.run(img);
            if (isError(r))
              return fail(r.error);
            set(r);
          })));
        }
        bar.append(button("Remove", () => set(null)));
      }
    }
    root.append(bar);
    if (img) {
      const label = el("label", `${P}-label`, "Description (alt text, required)");
      const alt = el("input", `${P}-input`);
      alt.type = "text";
      alt.value = img.alt;
      alt.required = true;
      alt.disabled = api.readOnly.isEnabled;
      alt.setAttribute("aria-invalid", String(!img.alt.trim()));
      alt.oninput = () => {
        img = { ...img, alt: alt.value };
        alt.setAttribute("aria-invalid", String(!alt.value.trim()));
        onChange(img);
      };
      label.append(alt);
      root.append(label);
    }
    root.append(note);
  }
  draw();
  return root;
}

// src/inline.ts
var KEEP = new Set(["B", "STRONG", "I", "EM", "U", "S", "DEL", "STRIKE", "SUP", "SUB", "MARK", "CODE", "A", "BR"]);
var DROP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "OBJECT"]);
function clean(src) {
  const out = document.createDocumentFragment();
  for (const n of Array.from(src.childNodes)) {
    if (n.nodeType === 3) {
      out.append(n.textContent ?? "");
      continue;
    }
    if (!(n instanceof HTMLElement) || DROP.has(n.tagName))
      continue;
    if (!KEEP.has(n.tagName)) {
      out.append(clean(n));
      continue;
    }
    const e = document.createElement(n.tagName);
    if (n.tagName === "A") {
      const href = n.getAttribute("href") ?? "";
      if (/^(https?:\/\/|\/(?!\/))/i.test(href))
        e.setAttribute("href", href);
    }
    if (n.tagName !== "BR")
      e.append(clean(n));
    out.append(e);
  }
  return out;
}
function setInline(target, html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  target.replaceChildren(clean(tpl.content));
}

// src/index.ts
function normalize(data) {
  const o = data && typeof data === "object" ? data : {};
  return { text: typeof o.text === "string" ? o.text : "", image: normalizeImage(o.image), side: o.side === "left" ? "left" : "right" };
}
var isValid = (d) => !!d.text.replace(/<[^>]*>/g, "").trim() && !!d.image && d.image.alt.trim() !== "";
var isEmpty = (d) => !d.text.replace(/<[^>]*>/g, "").trim() && !d.image;

class TextPictureTool {
  opts;
  data;
  root = el("div", "ejs-text-picture");
  constructor(opts) {
    this.opts = opts;
    this.data = normalize(opts.data);
  }
  static get toolbox() {
    return { title: "Text and picture", icon: '<svg width="17" height="15" viewBox="0 0 17 15"><path d="M1 3h6M1 7h6M1 11h6" stroke="currentColor" stroke-width="1.6"/><rect x="9" y="2" width="7" height="10" rx="1.5" fill="currentColor"/></svg>' };
  }
  static get isReadOnlySupported() {
    return true;
  }
  static get sanitize() {
    return { text: { b: true, i: true, u: true, s: true, sup: true, sub: true, mark: true, code: true, a: { href: true } }, side: true, image: true };
  }
  render() {
    this.root.addEventListener("input", () => this.opts.block.dispatchChange());
    this.draw();
    return this.root;
  }
  save() {
    return this.data;
  }
  validate(data) {
    return !isEmpty(normalize(data));
  }
  renderSettings() {
    return ["left", "right"].map((side) => ({
      icon: side === "left" ? "◧" : "◨",
      title: side === "left" ? "Picture on the left" : "Picture on the right",
      isActive: this.data.side === side,
      closeOnActivate: true,
      onActivate: () => {
        this.data.side = side;
        this.root.dataset.side = side;
      }
    }));
  }
  draw() {
    const ro = this.opts.api.readOnly.isEnabled;
    this.root.replaceChildren();
    this.root.dataset.side = this.data.side;
    const text = el("div", "ejs-text-picture-text");
    text.contentEditable = String(!ro);
    text.dataset.placeholder = "Text";
    setInline(text, this.data.text);
    text.oninput = () => {
      this.data.text = text.innerHTML;
    };
    text.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === "Backspace")
        e.stopPropagation();
    };
    const pic = imageField({ value: this.data.image, config: this.opts.config ?? {}, api: this.opts.api, onChange: (v) => {
      this.data.image = v;
    } });
    pic.classList.add("ejs-text-picture-pic");
    this.root.append(text, pic);
  }
}
export {
  TextPictureTool as default,
  isEmpty,
  isValid,
  normalize
};
