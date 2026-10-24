import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Check, ChefHat, ChevronDown, Clock3, Minus, Plus,
  Search, ShoppingBag, SlidersHorizontal, Sparkles, Truck, X, Leaf, Flame,
  CircleAlert, RotateCw, UtensilsCrossed
} from 'lucide-react';

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(Number(value) || 0);

const foodArt = {
  burger: '🍔', pizza: '🍕', pasta: '🍝', salad: '🥗', dessert: '🍰',
  drink: '🥤', rice: '🍛', sandwich: '🥪', default: '🍽️'
};
function emojiFor(item) {
  const text = (item.name + ' ' + item.category).toLowerCase();
  if (/burger|patty/.test(text)) return foodArt.burger;
  if (/pizza/.test(text)) return foodArt.pizza;
  if (/pasta|noodle|macaroni/.test(text)) return foodArt.pasta;
  if (/salad|healthy|vegan/.test(text)) return foodArt.salad;
  if (/cake|dessert|brownie|ice cream|sweet/.test(text)) return foodArt.dessert;
  if (/juice|drink|coffee|tea|shake|cola/.test(text)) return foodArt.drink;
  if (/rice|biryani|curry|thali/.test(text)) return foodArt.rice;
  if (/sandwich|wrap|roll/.test(text)) return foodArt.sandwich;
  return foodArt.default;
}
const palettes = ['peach', 'mint', 'lavender', 'butter', 'rose'];

function App() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/menu')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load the menu.');
        return data.items || [];
      })
      .then((items) => { if (alive) { setMenu(items); setError(''); } })
      .catch(() => { if (alive) setError('We couldn’t reach the menu service. Check that the Menu Service is running, then try again.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]);

  const categories = useMemo(() => ['All', ...new Set(menu.filter((i) => i.available !== false).map((i) => i.category).filter(Boolean))], [menu]);
  const visibleMenu = useMemo(() => menu.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = (item.name + ' ' + (item.description || '') + ' ' + item.category)
      .toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch && item.available !== false;
  }), [menu, activeCategory, search]);

  const cartItems = useMemo(() => menu.filter((item) => cart[item.id] > 0)
    .map((item) => ({ ...item, quantity: cart[item.id] })), [menu, cart]);
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = 0;
  const total = subtotal + delivery;

  function changeQuantity(id, delta) {
    setCart((old) => {
      const next = { ...old };
      const value = (next[id] || 0) + delta;
      if (value <= 0) delete next[id]; else next[id] = Math.min(value, 99);
      return next;
    });
  }

  async function placeOrder(event) {
    event.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email.trim(),
          items: cartItems.map((item) => ({ menuItemId: item.id, quantity: item.quantity }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Order could not be placed.');
      setOrder(data);
      setCart({});
      setCheckout(false);
      setShowCart(false);
    } catch (err) {
      setError(err.message || 'Something went wrong while placing your order.');
    } finally {
      setPlacing(false);
    }
  }

  return <div className="app-shell">
    <div className="top-strip"><Sparkles size={14} /> GOOD FOOD. GOOD MOOD. <span>Made fresh, just for you.</span></div>
    <header className="site-header">
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setOrder(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <span className="brand-mark"><UtensilsCrossed size={21} strokeWidth={2.5} /></span>
        <span>crumb<span className="brand-dot">.</span><small>YOUR LITTLE FOOD PLACE</small></span>
      </a>
      <nav className="desktop-nav"><a href="#menu">Menu</a><a href="#how-it-works">How it works</a><a href="#about">Our vibe</a></nav>
      <button className="cart-button" onClick={() => { setShowCart(true); setCheckout(false); }} aria-label="Open cart">
        <ShoppingBag size={18} /><span>Your bag</span><b>{count}</b>
      </button>
    </header>

    <main>
      {order ? <section className="success-screen">
        <div className="success-icon"><BadgeCheck size={42} /></div>
        <p className="eyebrow">ORDER RECEIVED</p>
        <h1>That’s a wrap.<br/><em>Your food journey starts here.</em></h1>
        <p className="success-copy">Your demo order has been saved successfully. This project doesn’t process real payments or arrange real delivery.</p>
        <div className="order-ticket">
          <div><span>Order reference</span><strong>{order.id}</strong></div>
          <div><span>Order status</span><strong className="status-pill">{order.status || 'PENDING'}</strong></div>
          <div><span>Order total</span><strong>{money(order.total)}</strong></div>
          <div><span>Confirmation email</span><strong>{order.customerEmail}</strong></div>
        </div>
        <button className="primary-button" onClick={() => { setOrder(null); setActiveCategory('All'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Back to the menu <ArrowRight size={17}/></button>
      </section> : <>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> A LITTLE JOY, DELIVERED</div>
            <h1>Good food.<br/> <em>Great</em> mood.</h1>
            <p>Your cravings called. We’ve got something delicious waiting. Pick your favourites and let the good times roll.</p>
            <a className="primary-button hero-cta" href="#menu">Explore the menu <ArrowRight size={17}/></a>
            <div className="hero-notes"><span><Check size={15}/> Easy ordering</span><span><Check size={15}/> Fresh picks</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a delicious burger and fries">
            <div className="art-sun"></div><div className="art-scribble">yum!</div>
            <div className="food-plate"><div className="plate-ring"></div><span className="hero-food">🍔</span><span className="hero-fries">🍟</span></div>
            <span className="floating-sticker sticker-one"><Leaf size={17}/> made with love</span>
            <span className="floating-sticker sticker-two"><span>✦</span> SO GOOD!</span>
            <span className="hero-spark spark-one">✳</span><span className="hero-spark spark-two">✦</span>
          </div>
          <div className="hero-bottom-note"><span>01 / 03</span><span>FRESH FLAVOURS, HAPPY HEARTS <ArrowRight size={14}/></span></div>
        </section>

        <section className="perks" id="how-it-works">
          <div className="perk"><span className="perk-icon"><ChefHat size={22}/></span><div><strong>Made for cravings</strong><small>Find a new favourite</small></div></div>
          <div className="perk"><span className="perk-icon"><Clock3 size={22}/></span><div><strong>Simple & speedy</strong><small>Order in a few clicks</small></div></div>
          <div className="perk"><span className="perk-icon"><Truck size={22}/></span><div><strong>Good things ahead</strong><small>A demo delivery experience</small></div></div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div><p className="eyebrow"><span className="eyebrow-line"/> THE GOOD STUFF</p><h2>Find your <em>happy plate.</em></h2><p className="section-subtitle">A little something for every kind of craving.</p></div>
            <div className="menu-count">{menu.filter((item) => item.available !== false).length.toString().padStart(2, '0')} <span>MENU ITEMS</span></div>
          </div>
          <div className="menu-tools">
            <div className="category-tabs" role="tablist" aria-label="Filter by category">
              {categories.map((category) => <button key={category} className={activeCategory === category ? 'category-tab active' : 'category-tab'} onClick={() => setActiveCategory(category)}>{category}</button>)}
            </div>
            <label className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find something tasty..." aria-label="Search menu"/></label>
          </div>

          {error && !order && <div className="notice error-notice"><CircleAlert size={18}/><span>{error}</span><button onClick={() => setReloadKey((n) => n + 1)}><RotateCw size={15}/> Retry</button></div>}
          {loading ? <div className="loading-grid">{[1,2,3,4].map((n) => <div className="skeleton-card" key={n}><div/><span/><span/></div>)}</div>
          : visibleMenu.length === 0 ? <div className="empty-menu"><span>🥣</span><h3>{menu.length ? 'No bites found.' : 'The kitchen is getting ready.'}</h3><p>{menu.length ? 'Try another search or category.' : 'Add a few menu items to your MenuItems table in DynamoDB and they’ll appear here.'}</p>{menu.length === 0 && <button className="text-button" onClick={() => setReloadKey((n) => n + 1)}>Refresh menu <RotateCw size={15}/></button>}</div>
          : <div className="food-grid">{visibleMenu.map((item, index) => <article className="food-card" key={item.id}>
            <div className={'food-art '+palettes[index % palettes.length]}>
              <span className="food-art-emoji">{emojiFor(item)}</span>
              <span className="food-category">{item.category}</span>
              <button className="add-button" onClick={() => changeQuantity(item.id, 1)} aria-label={'Add '+item.name+' to bag'}>{cart[item.id] ? <Check size={19}/> : <Plus size={19}/>}</button>
              {cart[item.id] > 0 && <span className="item-in-bag">{cart[item.id]} in bag</span>}
              {index === 0 && <span className="popular-tag"><Flame size={12} fill="currentColor"/> CROWD FAVOURITE</span>}
            </div>
            <div className="food-details"><div className="food-title-row"><h3>{item.name}</h3><strong>{money(item.price)}</strong></div>
              <p>{item.description || 'A delicious pick, made for your kind of day.'}</p>
              <div className="food-card-bottom"><span><span className="tiny-star">✦</span> Made for your mood</span>{cart[item.id] > 0 && <div className="mini-quantity"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Remove one"><Minus size={13}/></button><b>{cart[item.id]}</b><button onClick={() => changeQuantity(item.id, 1)} aria-label="Add one"><Plus size={13}/></button></div>}</div>
            </div>
          </article>)}</div>}
        </section>
        <section className="about-band" id="about"><div className="about-doodle">✳</div><p className="eyebrow">NO FUSS, JUST FLAVOUR</p><h2>Made for the <em>little moments.</em></h2><p>Lunch breaks, late-night cravings, or a “just because” treat. Whatever your reason, there’s a little happiness on the menu.</p><a href="#menu">Find your next favourite <ArrowRight size={16}/></a></section>
      </>}
    </main>

    <footer className="site-footer"><a className="footer-brand" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>crumb<span>.</span></a><p>A small food-ordering microservices demo, made with a big appetite.</p><span className="footer-tag">BUILT TO LEARN · SERVED WITH LOVE</span></footer>

    {showCart && <div className="drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}>
      <aside className="cart-drawer" aria-label="Shopping bag">
        <div className="drawer-heading"><div><p className="eyebrow">YOUR GOODIES</p><h2>{checkout ? 'Almost there.' : 'Your bag.'}</h2></div><button className="icon-button" onClick={() => setShowCart(false)} aria-label="Close bag"><X size={21}/></button></div>
        {checkout ? <>
          <button className="back-link" onClick={() => setCheckout(false)}>← Back to your bag</button>
          <div className="checkout-note"><span>✦</span><div><strong>One last little thing</strong><p>Add an email for your order record. No account needed.</p></div></div>
          <form className="checkout-form" onSubmit={placeOrder}>
            <label htmlFor="email">Email address</label><input id="email" type="email" required maxLength="254" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/>
            <div className="checkout-summary"><span>{count} {count === 1 ? 'item' : 'items'}</span><strong>{money(total)}</strong></div>
            <p className="demo-disclaimer">Demo checkout only. No real payment will be taken and no delivery is arranged.</p>
            {error && <p className="inline-error"><CircleAlert size={15}/>{error}</p>}
            <button className="primary-button full-button" type="submit" disabled={placing || count === 0}>{placing ? 'Placing order…' : 'Place demo order'} <ArrowRight size={17}/></button>
          </form>
        </> : <>
          {cartItems.length === 0 ? <div className="empty-cart"><span>🛍️</span><h3>Your bag is feeling lonely.</h3><p>Give it something delicious to hold.</p><button className="primary-button" onClick={() => setShowCart(false)}>Explore menu <ArrowRight size={16}/></button></div>
          : <>
            <div className="cart-items">{cartItems.map((item) => <div className="cart-item" key={item.id}><div className={'cart-thumb '+palettes[menu.findIndex((m) => m.id === item.id) % palettes.length]}>{emojiFor(item)}</div><div className="cart-item-info"><strong>{item.name}</strong><span>{money(item.price)} each</span><div className="quantity-control"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Remove one"><Minus size={13}/></button><b>{item.quantity}</b><button onClick={() => changeQuantity(item.id, 1)} aria-label="Add one"><Plus size={13}/></button></div></div><strong className="cart-line-total">{money(item.price * item.quantity)}</strong></div>)}</div>
            <div className="bill"><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>Demo delivery fee</span><span>{money(delivery)}</span></div><div className="bill-total"><strong>Total</strong><strong>{money(total)}</strong></div></div>
            <button className="primary-button full-button" onClick={() => { setCheckout(true); setError(''); }}>Continue to checkout <ArrowRight size={17}/></button>
            <p className="drawer-footnote"><Check size={14}/> No account. No real payment. Just a demo order.</p>
          </>}
        </>}
      </aside>
    </div>}
    {!showCart && !order && count > 0 && <button className="mobile-cart-fab" onClick={() => setShowCart(true)}><ShoppingBag size={18}/> View bag · {count} <span>{money(subtotal)}</span></button>}
  </div>;
}

export default App;