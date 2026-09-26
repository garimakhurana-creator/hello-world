const PRODUCTS = [
  {
    id: "rani", name: "Rani Ruby Shield", motif: "Kamal & Kundan", price: 24900,
    cat: ["unisex", "heirloom"], badge: "Limited · 50 pairs", gold: true,
    images: ["images/rani-ruby-shield.webp"],
    desc: "Our crown piece. A translucent ruby shield with a gilded brow bar holding 38 hand-set stones in kundan style, including lab-grown rubies and white sapphires. Each pair is numbered and comes with a certificate of craft.",
    lens: ["#5a1f16", "#1a1a1a"],
    specs: [["Frame", "Ruby acetate, 24k gilded brass"], ["Stones", "38, lab-grown ruby & sapphire"], ["Lens", "UV400, polarised"], ["Fit", "Wide · 148mm"]],
  },
  {
    id: "garuda", name: "Garuda Wing Wrap", motif: "Garuda", price: 21900,
    cat: ["men", "heirloom"], badge: "Heirloom", gold: true,
    images: ["images/garuda-wrap.webp"],
    desc: "A sculpted wrap with a gilded Garuda wing sweeping along each temple, finished with engineered hinge cogs. Mirrored amber lenses sharpen contrast in harsh sun.",
    lens: ["#d88a1a", "#2a2a2a"],
    specs: [["Frame", "Matte black TR90, gilded brass wings"], ["Lens", "Amber mirror, UV400"], ["Weight", "34g"], ["Fit", "Wide · 150mm"]],
  },
  {
    id: "panna", name: "Panna Emerald Cat-Eye", motif: "Yali", price: 18500,
    cat: ["women"], badge: "Bestseller",
    images: ["images/panna-cat-eye.webp"],
    desc: "A bottle-green cat-eye whose upswept corners are guarded by gilded yali heads set among emerald cabochons. Soft green lenses flatter warm skin tones.",
    lens: ["#2f4a36", "#3a2a1a"],
    specs: [["Frame", "Emerald acetate, gilded brass"], ["Stones", "14 emerald-green cabochons"], ["Lens", "Green, UV400"], ["Fit", "Medium · 140mm"]],
  },
  {
    id: "yatra", name: "Yatra Procession Visor", motif: "Gaja", price: 16500,
    cat: ["unisex"], badge: "New",
    images: ["images/yatra-visor.svg"],
    desc: "A single-lens visor crowned with a sterling-toned brow band. A royal procession of elephants and attendants is engraved across it, adapted from a Mughal-era frieze.",
    lens: ["#1a1a1c", "#4a3a2a"],
    specs: [["Frame", "Oxidised silver-plated brass"], ["Lens", "Smoke, UV400"], ["Weight", "29g"], ["Fit", "Wide · 152mm"]],
  },
  {
    id: "chandni", name: "Chandni Frost Shield", motif: "Jaali florals", price: 14900,
    cat: ["women"], badge: "",
    images: ["images/chandni-shield.webp"],
    desc: "Moonlight, rendered in acetate. A frosted crystal shield with jaali-inspired florals pressed in silver across the brow and temples. Gradient lenses let your eyes show through.",
    lens: ["#6b5b4b", "#2a2a2a"],
    specs: [["Frame", "Frosted crystal acetate, silver inlay"], ["Lens", "Brown gradient, UV400"], ["Weight", "31g"], ["Fit", "Wide · 146mm"]],
  },
  {
    id: "kamal", name: "Kamal Lotus Shield", motif: "Kamal", price: 13900,
    cat: ["unisex"], badge: "Campaign",
    images: ["images/kamal-shield.svg", "images/campaign-ivory.webp"],
    desc: "The face of The Ivory Edit. A deep oxblood shield with solid brass lotus plaques on each hinge, hand-polished for four hours before gilding.",
    lens: ["#5a1f16", "#1a1a1a"],
    specs: [["Frame", "Oxblood acetate, gilded brass"], ["Lens", "Rouge, UV400"], ["Weight", "33g"], ["Fit", "Wide · 148mm"]],
  },
  {
    id: "gaja", name: "Gaja Elephant Rectangle", motif: "Gaja", price: 12500,
    cat: ["men"], badge: "",
    images: ["images/gaja-rectangle.webp"],
    desc: "A chunky burgundy rectangle with an engraved silver elephant charging along each temple. Understated from the front, a statement in profile.",
    lens: ["#5a1f16", "#2a2a2a"],
    specs: [["Frame", "Burgundy acetate, silver-plated brass"], ["Lens", "Wine, UV400"], ["Weight", "30g"], ["Fit", "Medium · 142mm"]],
  },
  {
    id: "neel", name: "Neel Chakra Square", motif: "Chakra", price: 11900,
    cat: ["unisex"], badge: "New",
    images: ["images/neel-chakra.svg"],
    desc: "A cobalt square in translucent acetate, anchored by gilded chakra medallions at each hinge. A wheel of motion and order, cast in brass.",
    lens: ["#111216", "#2a3350"],
    specs: [["Frame", "Cobalt acetate, gilded brass"], ["Lens", "Black, UV400, polarised"], ["Weight", "32g"], ["Fit", "Medium · 144mm"]],
  },
  {
    id: "vyaghra", name: "Vyaghra Tiger Oversized", motif: "Vyaghra", price: 9900,
    cat: ["women"], badge: "",
    images: ["images/vyaghra-oversized.jpg"],
    desc: "An oversized frame in midnight-blue textured acetate. A small engraved tiger prowls along the temple, a nod to the royal hunts of Rajputana.",
    lens: ["#1a1a22", "#3a2a1a"],
    specs: [["Frame", "Midnight textured acetate"], ["Lens", "Grey gradient, UV400"], ["Weight", "28g"], ["Fit", "Wide · 146mm"]],
  },
  {
    id: "kesar", name: "Kesar Saffron Rectangle", motif: "Rajwada scroll", price: 8900,
    cat: ["women"], badge: "",
    images: ["images/kesar-rectangle.jpg"],
    desc: "A slim nineties rectangle in saffron acetate with an ornate silver scroll at the hinge. It's the everyday IKSHĀ that dresses up anything.",
    lens: ["#4a2a1a", "#1a1a1a"],
    specs: [["Frame", "Saffron acetate, silver-plated brass"], ["Lens", "Brown, UV400"], ["Weight", "24g"], ["Fit", "Narrow · 136mm"]],
  },
  {
    id: "surya", name: "Surya Tortoise Round", motif: "Surya", price: 7500,
    cat: ["unisex"], badge: "Entry to IKSHĀ",
    images: ["images/surya-round.svg"],
    desc: "A classic round frame in warm tortoise with gilded sun medallions at the corners. It's our most wearable piece and a first heirloom.",
    lens: ["#3a2614", "#1a1a1a"],
    specs: [["Frame", "Tortoise acetate, gilded brass"], ["Lens", "Brown, UV400"], ["Weight", "22g"], ["Fit", "Medium · 140mm"]],
  },
];

const FREE_SHIP_NOTE = 15000; // threshold for complimentary gift wrap message
const inr = (n) => "₹" + n.toLocaleString("en-IN");
const $ = (s, el = document) => el.querySelector(s);
const byId = (id) => PRODUCTS.find((p) => p.id === id);

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ }
  },
};

let cart = store.get("iksha-cart", []);
let wish = store.get("iksha-wish", []);
let filter = "all";
let sort = "featured";

/* ---------- Grid ---------- */
const heartSvg = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.2-8.6C1.2 8.2 3.2 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.5 0 5.5 3.7 3.9 6.9C19 15.6 12 20 12 20z"/></svg>';

function renderGrid() {
  let list = PRODUCTS.filter((p) => filter === "all" || p.cat.includes(filter));
  if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);

  $("#grid").innerHTML = list.map((p, i) => `
    <article class="card" data-id="${p.id}" style="animation-delay:${i * 50}ms">
      <div class="card-media">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
        ${p.images[1] ? `<img class="alt" src="${p.images[1]}" alt="" loading="lazy">` : ""}
        ${p.badge ? `<span class="badge ${p.gold ? "gold" : ""}">${p.badge}</span>` : ""}
        <button class="heart ${wish.includes(p.id) ? "on" : ""}" data-wish="${p.id}" aria-label="Save ${p.name}">${heartSvg}</button>
        <button class="quick" data-add="${p.id}">Add to bag</button>
      </div>
      <div class="card-info">
        <div><h3>${p.name}</h3><p>${p.motif}</p></div>
        <span class="card-price">${inr(p.price)}</span>
      </div>
    </article>`).join("");
}

$("#grid").addEventListener("click", (e) => {
  const w = e.target.closest("[data-wish]");
  const a = e.target.closest("[data-add]");
  const card = e.target.closest(".card");
  if (w) { toggleWish(w.dataset.wish); w.classList.toggle("on"); return; }
  if (a) { addToCart(a.dataset.add); return; }
  if (card) openQuickView(card.dataset.id);
});

$("#chips").addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (c) setFilter(c.dataset.filter);
});

function setFilter(f) {
  filter = f;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === f));
  renderGrid();
}

document.querySelectorAll(".cat").forEach((c) => c.addEventListener("click", () => setFilter(c.dataset.filter)));
$("#sort").addEventListener("change", (e) => { sort = e.target.value; renderGrid(); });

/* ---------- Wishlist ---------- */
function toggleWish(id) {
  wish = wish.includes(id) ? wish.filter((x) => x !== id) : [...wish, id];
  store.set("iksha-wish", wish);
  updateCounts();
  toast(wish.includes(id) ? `${byId(id).name} saved to wishlist` : "Removed from wishlist");
}

/* ---------- Quick view ---------- */
let current = null;
let lensIdx = 0;

function openQuickView(id) {
  const p = byId(id);
  current = p;
  lensIdx = 0;
  $("#qvImg").src = p.images[0];
  $("#qvImg").alt = p.name;
  $("#qvThumbs").innerHTML = p.images.length > 1
    ? p.images.map((src, i) => `<button class="${i === 0 ? "on" : ""}" data-src="${src}"><img src="${src}" alt=""></button>`).join("")
    : "";
  $("#qvMotif").textContent = `Motif · ${p.motif}`;
  $("#qvName").textContent = p.name;
  $("#qvPrice").textContent = inr(p.price);
  $("#qvEmi").textContent = `or 3 interest-free payments of ${inr(Math.ceil(p.price / 3))}`;
  $("#qvDesc").textContent = p.desc;
  renderLens();
  $("#qvSpecs").innerHTML = p.specs.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join("");
  openLayer("#modal");
}

function renderLens() {
  $("#qvLens").innerHTML = current.lens
    .map((c, i) => `<button class="swatch ${i === lensIdx ? "on" : ""}" style="background:${c}" data-lens="${i}" aria-label="Lens option ${i + 1}"></button>`)
    .join("");
}

$("#qvLens").addEventListener("click", (e) => {
  const s = e.target.closest("[data-lens]");
  if (s) { lensIdx = +s.dataset.lens; renderLens(); }
});

$("#qvThumbs").addEventListener("click", (e) => {
  const t = e.target.closest("[data-src]");
  if (!t) return;
  $("#qvImg").src = t.dataset.src;
  document.querySelectorAll("#qvThumbs button").forEach((b) => b.classList.toggle("on", b === t));
});

$("#qvAdd").addEventListener("click", () => {
  addToCart(current.id, lensIdx);
  closeLayer("#modal");
});

document.querySelectorAll("[data-open]").forEach((el) =>
  el.addEventListener("click", () => openQuickView(el.dataset.open)));

/* ---------- Cart ---------- */
function addToCart(id, lens = 0) {
  const line = cart.find((l) => l.id === id && l.lens === lens);
  if (line) line.qty++;
  else cart.push({ id, lens, qty: 1 });
  saveCart();
  toast(`${byId(id).name} added to your bag`);
  bump("#cartCount");
}

function saveCart() {
  store.set("iksha-cart", cart);
  renderCart();
  updateCounts();
}

function renderCart() {
  const total = cart.reduce((s, l) => s + byId(l.id).price * l.qty, 0);
  $("#subtotal").textContent = inr(total);
  const left = FREE_SHIP_NOTE - total;
  $("#shipMsg").textContent = total === 0
    ? "Shipping is always free across India."
    : left > 0
      ? `Add ${inr(left)} more for complimentary heirloom gift wrap.`
      : "Your order ships free, gift-wrapped in our heirloom box.";
  $("#shipFill").style.width = Math.min(100, (total / FREE_SHIP_NOTE) * 100) + "%";

  $("#drawerItems").innerHTML = cart.length === 0
    ? `<li class="empty" style="display:block"><p>Your bag is empty</p>Every heirloom starts somewhere.</li>`
    : cart.map((l, i) => {
        const p = byId(l.id);
        return `<li>
          <img src="${p.images[0]}" alt="${p.name}">
          <div>
            <div class="di-top"><h4>${p.name}</h4><span>${inr(p.price * l.qty)}</span></div>
            <p class="di-meta">${p.motif} · Lens ${l.lens + 1}</p>
            <div class="di-row">
              <div class="qty"><button data-dec="${i}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Increase">+</button></div>
              <button class="remove" data-rm="${i}">Remove</button>
            </div>
          </div>
        </li>`;
      }).join("");
  $("#checkout").disabled = cart.length === 0;
  $("#checkout").style.opacity = cart.length ? 1 : .5;
}

$("#drawerItems").addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.inc) cart[+t.dataset.inc].qty++;
  else if (t.dataset.dec) {
    const l = cart[+t.dataset.dec];
    if (--l.qty === 0) cart.splice(+t.dataset.dec, 1);
  } else if (t.dataset.rm) cart.splice(+t.dataset.rm, 1);
  else return;
  saveCart();
});

$("#checkout").addEventListener("click", () => toast("Checkout is coming soon. Your bag is saved."));

function updateCounts() {
  $("#cartCount").textContent = cart.reduce((s, l) => s + l.qty, 0);
  $("#wishCount").textContent = wish.length;
}

/* ---------- Layers ---------- */
function openLayer(sel) {
  $(sel).classList.add("open");
  $(sel).setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeLayer(sel) {
  $(sel).classList.remove("open");
  $(sel).setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$("#cartBtn").addEventListener("click", () => openLayer("#drawer"));
$("#wishBtn").addEventListener("click", () => {
  if (!wish.length) return toast("Tap the heart on any frame to save it");
  setFilter("all");
  document.getElementById("shop").scrollIntoView();
  toast(`Saved: ${wish.map((id) => byId(id).name).join(", ")}`);
});
document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => closeLayer("#modal")));
document.querySelectorAll("[data-close-cart]").forEach((el) => el.addEventListener("click", () => closeLayer("#drawer")));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeLayer("#modal"); closeLayer("#drawer"); }
});

$("#menuBtn").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));

/* ---------- Misc ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function bump(sel) {
  const el = $(sel);
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

$("#joinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.hidden = true;
  $("#joinOk").hidden = false;
});

renderGrid();
renderCart();
updateCounts();
