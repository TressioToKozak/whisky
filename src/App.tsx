import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Clock3, MapPin, Menu as MenuIcon, Phone, Quote, X } from 'lucide-react'
import { flights, whiskies } from './data'

const nav = [['/menu', 'Menu'], ['/degustacje', 'Degustacje'], ['/o-nas', 'O nas'], ['/kontakt', 'Kontakt']]
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`
const imageFallback = asset('whisky/fallback.svg')
const useFallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.onerror = null
  event.currentTarget.src = imageFallback
}

function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }) }, [location.pathname])
  return <>
    <a className="skip" href="#main">Przejdź do treści</a>
    <header className="navbar">
      <Link to="/" aria-label="Rzeszowska Beczka — strona główna"><img src={asset('06_header_horizontal_transparent_1600x450.png')} alt="Rzeszowska Beczka" /></Link>
      <button className="nav-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Otwórz menu">{open ? <X /> : <MenuIcon />}</button>
      <nav className={open ? 'open' : ''} aria-label="Główne menu">
        {nav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        <Link className="button small" to="/rezerwacje">Zarezerwuj stolik</Link>
      </nav>
    </header>
    <main id="main">{children}</main>
    <Footer />
  </>
}

function Footer() {
  return <footer><div className="footer-grid container">
    <div><img className="footer-logo" src={asset('06_header_horizontal_transparent_1600x450.png')} alt="Rzeszowska Beczka" /><p>Whisky bez zadęcia.<br />Smak, historie i dobre rozmowy.</p></div>
    <div><h3>Odwiedź nas</h3><p>ul. 3 Maja 12<br />35-030 Rzeszów</p><p>Wt–Czw: 17:00–00:00<br />Pt–Sob: 17:00–02:00</p></div>
    <div><h3>Na skróty</h3><Link to="/menu">Menu whisky</Link><Link to="/degustacje">Degustacje</Link><Link to="/rezerwacje">Rezerwacje</Link><Link to="/kontakt">Kontakt</Link></div>
    <div><h3>Bądź blisko</h3><div className="socials"><a href="#instagram" aria-label="Instagram"><span aria-hidden="true">IG</span></a><a href="#facebook" aria-label="Facebook"><span aria-hidden="true">FB</span></a></div><a href="mailto:hello@rzeszowskabeczka.pl">hello@rzeszowskabeczka.pl</a></div>
  </div><div className="copyright container"><span>© 2026 Rzeszowska Beczka</span><span>Alkohol tylko dla pełnoletnich. Pij odpowiedzialnie.</span></div></footer>
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className="eyebrow"><span />{children}</p>

function Home() {
  return <>
    <section className="hero"><div className="hero-mark" /><div className="container hero-content"><Eyebrow>Whisky bar · Rzeszów</Eyebrow><h1>Każda beczka<br />ma swoją <em>historię.</em></h1><p className="lead">60 starannie wybranych etykiet. Zero zadęcia. Tylko dobry smak, ludzie i opowieści, do których chce się wracać.</p><div className="actions"><Link className="button" to="/menu">Odkryj nasze menu <ArrowRight /></Link><Link className="text-link" to="/rezerwacje">Zarezerwuj stolik</Link></div></div><div className="scroll-hint">PRZEWIŃ <ChevronDown /></div></section>
    <section className="intro container split"><div><Eyebrow>Nie musisz się znać</Eyebrow><h2>Wystarczy, że masz<br /><em>ochotę odkrywać.</em></h2></div><div><p className="big-copy">Rzeszowska Beczka to miejsce, w którym whisky przestaje być onieśmielająca. Opowiadamy o niej po ludzku i dobieramy smak do Ciebie — nie odwrotnie.</p><Link className="arrow-link" to="/o-nas">Poznaj naszą historię <ArrowRight /></Link></div></section>
    <section className="featured dark-section"><div className="container"><div className="section-head"><div><Eyebrow>Wybór barmana</Eyebrow><h2>Warto dziś <em>spróbować</em></h2></div><Link className="arrow-link" to="/menu">Zobacz całe menu <ArrowRight /></Link></div><div className="whisky-grid">{whiskies.slice(0,3).map((w, i) => <WhiskyCard key={w.slug} whisky={w} number={`0${i+1}`} />)}</div></div></section>
    <section className="flight-promo container"><div className="promo-card"><Eyebrow>Nie możesz się zdecydować?</Eyebrow><h2>Wybierz <em>tasting flight.</em></h2><p>Trzy lub cztery starannie dobrane whisky, podane w kolejności, która ma znaczenie. Mała podróż — bez wychodzenia z baru.</p><Link className="button" to="/degustacje">Zobacz zestawy <ArrowRight /></Link></div><img src={asset('03_emblem_circle_transparent_1024.png')} alt="" /></section>
    <section className="quote"><div className="container"><Quote /><blockquote>„Najlepsza whisky to ta,<br />która smakuje <em>Tobie.</em>”</blockquote><p>— zasada, której trzymamy się od początku</p></div></section>
    <section className="visit container split"><div><Eyebrow>Wpadnij na kieliszek</Eyebrow><h2>Wieczór zaczyna się<br /><em>przy beczce.</em></h2><div className="info-row"><MapPin /><span><strong>Rzeszów, ul. 3 Maja 12</strong><small>5 minut od Rynku</small></span></div><div className="info-row"><Clock3 /><span><strong>Wt–Czw 17:00–00:00</strong><small>Pt–Sob 17:00–02:00</small></span></div></div><div className="visit-box"><span>Masz plan na wieczór?</span><h3>Zarezerwuj miejsce<br />przy naszym stole.</h3><Link className="button" to="/rezerwacje">Rezerwuję stolik <ArrowRight /></Link></div></section>
  </>
}

function WhiskyCard({ whisky: w, number }: { whisky: typeof whiskies[number], number: string }) {
  return <Link className="whisky-card" to={`/menu/${w.slug}`}>
    <span className="card-number">{number}</span>
    <div className="card-image"><img src={w.imageUrl} onError={useFallback} alt={w.image.alt} loading="lazy" /></div>
    <p>{w.category}</p><h3>{w.name}</h3><span className="segment">{w.segment}</span>
    <div className="serving-prices"><strong>25 ml <b>— {w.price25} zł</b></strong><span>50 ml <b>— {w.price50} zł</b></span></div>
    <span className="card-link">Zobacz whisky <ArrowRight /></span>
  </Link>
}

function MenuPage() {
  const [country, setCountry] = useState('Wszystkie')
  const [segment, setSegment] = useState('Wszystkie')
  const [query, setQuery] = useState('')
  const countries = ['Wszystkie', 'Szkocja', 'Irlandia', 'USA', 'Japonia', 'Reszta świata']
  const segments = ['Wszystkie', 'Wejściowa', 'Standard', 'Premium', 'Prestige']
  const shown = useMemo(() => whiskies.filter(w =>
    (country === 'Wszystkie' || w.category === country) &&
    (segment === 'Wszystkie' || w.segment === segment) &&
    w.name.toLowerCase().includes(query.toLowerCase())
  ), [country, segment, query])
  return <>
    <PageHero eyebrow="Karta whisky" title={<>Znajdź swój <em>smak.</em></>} text="Klasyki, niezależne rozlewnie i butelki z mniej oczywistych zakątków świata." ><div className="filters"><label><span className="sr-only">Szukaj whisky</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj po nazwie…" /></label><div className="filter-group"><span>Kraj / kategoria</span><div className="filter-buttons">{countries.map(c => <button className={country === c ? 'active' : ''} onClick={() => setCountry(c)} key={c}>{c}</button>)}</div></div><div className="filter-group"><span>Segment</span><div className="filter-buttons">{segments.map(s => <button className={segment === s ? 'active' : ''} onClick={() => setSegment(s)} key={s}>{s}</button>)}</div></div></div></PageHero>
    <section className="container menu-section"><p className="results">{shown.length} {shown.length === 1 ? 'pozycja' : 'pozycji'}</p><div className="whisky-grid">{shown.map((w, i) => <WhiskyCard whisky={w} number={String(i+1).padStart(2,'0')} key={w.slug} />)}</div></section>
  </>
}

function WhiskyDetail() {
  const { slug } = useParams(); const w = whiskies.find(item => item.slug === slug)
  if (!w) return <NotFound />
  return <section className="detail container"><Link className="back" to="/menu">← Wróć do menu</Link><div className="detail-grid"><div className="bottle-shape"><img src={w.imageUrl} onError={useFallback} alt={w.image.alt} /></div><div><Eyebrow>{w.category}</Eyebrow><h1>{w.name}</h1><p className="lead">Poznaj tę etykietę przy naszym barze — opowiemy o jej charakterze i pomożemy wybrać odpowiednią porcję.</p><div className="specs"><div><small>KRAJ / KATEGORIA</small><strong>{w.category}</strong></div><div><small>SEGMENT</small><strong>{w.segment}</strong></div><div><small>OBJĘTOŚĆ BUTELKI</small><strong>{w.purchase.bottleVolumeMl} ml</strong></div></div><div className="detail-prices"><div><small>GŁÓWNA PORCJA DEGUSTACYJNA</small><strong>25 ml — {w.price25} zł</strong></div><div><small>WIĘKSZA PORCJA</small><span>50 ml — {w.price50} zł</span></div></div><Link className="button" to="/rezerwacje">Spróbuj przy barze <ArrowRight /></Link></div></div></section>
}

function Tastings() {
 return <><PageHero eyebrow="Degustacje" title={<>Posmakuj. Porównaj.<br /><em>Zapamiętaj.</em></>} text="Prowadzone bez wykładu i bez trudnych słów. Za to z ciekawymi historiami i whisky, które potrafią zaskoczyć." />
 <section className="container tasting-section"><div className="section-head"><div><Eyebrow>Zestawy degustacyjne</Eyebrow><h2>Podróż w kilku <em>kieliszkach</em></h2></div><p>Możesz zamówić je w każdej chwili — samodzielnie lub z krótkim wprowadzeniem barmana.</p></div><div className="flight-grid">{flights.map((f,i)=><article className="flight" key={f.name}><span>0{i+1}</span><p>{f.accent}</p><h3>{f.name}</h3><p>{f.desc}</p><div><strong>{f.items}</strong><b>{f.price} zł</b></div></article>)}</div></section>
 <section className="dark-section"><div className="container event"><div><Eyebrow>Degustacje prowadzone</Eyebrow><h2>Wieczór z whisky<br /><em>i dobrym przewodnikiem.</em></h2><p>60–90 minut, 5 starannie dobranych próbek, woda i opowieść dopasowana do poziomu grupy. Dla 4–12 osób.</p><ul><li><Check /> urodziny i spotkania ze znajomymi</li><li><Check /> integracje firmowe</li><li><Check /> prezent w formie przeżycia</li></ul></div><div className="event-price"><span>od</span><strong>149 zł</strong><small>/ osoba</small><Link className="button" to="/rezerwacje">Zapytaj o termin <ArrowRight /></Link></div></div></section></>
}

function About() { return <><PageHero eyebrow="O Rzeszowskiej Beczce" title={<>Bar z charakterem.<br /><em>Bez pozy.</em></>} text="Z miłości do whisky, Rzeszowa i spotkań, których nie chce się kończyć." /><section className="container story split"><div><img src={asset('03_emblem_circle_transparent_1024.png')} alt="Znak Rzeszowskiej Beczki" /></div><div><Eyebrow>Nasza historia</Eyebrow><h2>Wszystko zaczęło się<br />od jednej <em>butelki.</em></h2><p>Najpierw były domowe degustacje i długie rozmowy o smakach. Potem pojawił się pomysł na miejsce, którego sami szukaliśmy: swobodne, miejskie i skupione na jakości.</p><p>Dziś na półkach mamy ponad 120 etykiet, ale nadal najbardziej liczy się dla nas człowiek po drugiej stronie baru.</p></div></section><section className="values dark-section"><div className="container"><Eyebrow>Nasze zasady</Eyebrow><div className="values-grid"><article><span>01</span><h3>Bez zadęcia</h3><p>Nie musisz znać regionów ani roczników. Pytaj, próbuj, szukaj swojego smaku.</p></article><article><span>02</span><h3>Z ciekawością</h3><p>Obok klasyków stawiamy butelki, o których jeszcze nie słyszałeś.</p></article><article><span>03</span><h3>Odpowiedzialnie</h3><p>Liczy się jakość doświadczenia, nie liczba kieliszków.</p></article></div></div></section></> }

function Reservation() { const [sent,setSent]=useState(false); return <PageHero eyebrow="Rezerwacje" title={<>Twój stolik<br /><em>już czeka.</em></>} text="Rezerwacje przyjmujemy dla grup do 12 osób. W piątki i soboty stolik utrzymujemy przez 15 minut."><div className="form-card">{sent ? <div className="success"><Check /><h2>Dziękujemy!</h2><p>Otrzymaliśmy Twoje zgłoszenie. Potwierdzenie wyślemy po sprawdzeniu dostępności.</p></div> : <form onSubmit={e=>{e.preventDefault();setSent(true)}}><div className="form-grid"><label>Imię i nazwisko<input required name="name" autoComplete="name" /></label><label>Telefon<input required type="tel" name="phone" autoComplete="tel" /></label><label>Data<input required type="date" name="date" /></label><label>Godzina<select required defaultValue=""><option value="" disabled>Wybierz</option><option>17:00</option><option>18:30</option><option>20:00</option><option>21:30</option></select></label><label>Liczba osób<select required defaultValue="2"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7–12</option></select></label><label>E-mail<input required type="email" name="email" autoComplete="email" /></label></div><label>Wiadomość (opcjonalnie)<textarea rows={3} placeholder="Degustacja, okazja, specjalne potrzeby…" /></label><label className="consent"><input required type="checkbox" /> <span>Wyrażam zgodę na kontakt w sprawie rezerwacji.</span></label><button className="button" type="submit">Wyślij rezerwację <ArrowRight /></button><small>Rezerwacja jest ważna po otrzymaniu potwierdzenia.</small></form>}</div></PageHero> }
function Contact() { return <><PageHero eyebrow="Kontakt" title={<>Spotkajmy się<br /><em>przy barze.</em></>} text="Masz pytanie, planujesz większe spotkanie albo szukasz pomysłu na degustację? Odezwij się." /><section className="container contact-grid"><a href="https://maps.google.com/?q=Rzeszów+3+Maja+12"><MapPin /><span><small>ADRES</small><strong>ul. 3 Maja 12, Rzeszów</strong><p>Wyznacz trasę →</p></span></a><a href="tel:+48171234567"><Phone /><span><small>TELEFON</small><strong>+48 17 123 45 67</strong><p>Zadzwoń do nas →</p></span></a><div><Clock3 /><span><small>GODZINY</small><strong>Wt–Czw 17:00–00:00<br />Pt–Sob 17:00–02:00</strong><p>Niedziela i poniedziałek: zamknięte</p></span></div></section></> }

function PageHero({ eyebrow, title, text, children }: { eyebrow:string,title:React.ReactNode,text:string,children?:React.ReactNode }) { return <section className="page-hero"><div className="page-emblem" /><div className="container"><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1><p className="lead">{text}</p>{children}</div></section> }
function NotFound(){return <section className="not-found container"><Eyebrow>Błąd 404</Eyebrow><h1>Ta beczka jest <em>pusta.</em></h1><p>Nie znaleźliśmy strony, której szukasz.</p><Link className="button" to="/">Wróć na stronę główną</Link></section>}

function AgeGate(){const [visible,setVisible]=useState(()=>localStorage.getItem('age-confirmed')!=='yes'); if(!visible)return null; const confirm=()=>{localStorage.setItem('age-confirmed','yes');setVisible(false)}; return <div className="age-overlay" role="dialog" aria-modal="true" aria-labelledby="age-title"><div className="age-card"><img src={asset('04_emblem_gold_transparent_1024.png')} alt="" /><Eyebrow>Witaj w Rzeszowskiej Beczce</Eyebrow><h2 id="age-title">Czy masz ukończone<br /><em>18 lat?</em></h2><p>Strona zawiera informacje o alkoholu i jest przeznaczona wyłącznie dla osób pełnoletnich.</p><div><button className="button" onClick={confirm}>Tak, mam 18 lat</button><a href="https://google.com">Nie, wychodzę</a></div><small>Pij odpowiedzialnie.</small></div></div>}

export default function App(){return <><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/menu" element={<MenuPage/>}/><Route path="/menu/:slug" element={<WhiskyDetail/>}/><Route path="/degustacje" element={<Tastings/>}/><Route path="/o-nas" element={<About/>}/><Route path="/rezerwacje" element={<Reservation/>}/><Route path="/kontakt" element={<Contact/>}/><Route path="*" element={<NotFound/>}/></Routes></Layout><AgeGate/></>}
