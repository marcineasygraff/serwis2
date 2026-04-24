import React, { useEffect, useMemo, useState } from "react";

// 🔐 UŻYTKOWNICY
const USERS = [
  { login: "admin", password: "1234", role: "admin" }
];

// 📍 BAZA FIRMY
const BASE = {
  lat: 49.8547,
  lon: 19.3386,
  name: "Andrychów, Lenartowicza 64",
};

// 🎨 STATUSY
const STATUS_STYLE = {
  Nowe: "bg-red-200 text-red-800",
  "W trakcie": "bg-yellow-200 text-yellow-800",
  Zakończone: "bg-green-200 text-green-800",
};

export default function App() {

  const [user, setUser] = useState(null);
  const [login, setLogin] = useState("");
  const [haslo, setHaslo] = useState("");

  const zaloguj = () => {
    const u = USERS.find(
      (x) => x.login === login && x.password === haslo
    );

    if (!u) return alert("Błędny login lub hasło");
    setUser(u);
  };

  const czyAdmin = user?.role === "admin";

  const [zakladka, setZakladka] = useState("kalkulator");

  const [ceny, setCeny] = useState({
    maszynowa: 7,
    reczna: 10,
    punkty: 50,
    km: 3,
    wyjazd: 150,
  });

  const [zlecenia, setZlecenia] = useState([]);
  const [historia, setHistoria] = useState([]);

  useEffect(() => {
    const z = localStorage.getItem("zlecenia");
    const h = localStorage.getItem("historia");

    if (z) setZlecenia(JSON.parse(z));
    if (h) setHistoria(JSON.parse(h));
  }, []);

  useEffect(() => {
    localStorage.setItem("zlecenia", JSON.stringify(zlecenia));
  }, [zlecenia]);

  useEffect(() => {
    localStorage.setItem("historia", JSON.stringify(historia));
  }, [historia]);

  const [formularz, setFormularz] = useState({
    klient: "",
    adres: "",
    telefon: "",
    dataWizyty: "",
    maszynowa: "",
    reczna: "",
    punkty: "",
  });

  const [km, setKm] = useState("");
  const [eta, setEta] = useState("");
  const [edycjaId, setEdycjaId] = useState(null);

  const licz = (v) => Number(v) || 0;

  // 🔧 FIX: poprawione fetch (BACKTICKI)
  const pobierzGeo = async (adres) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adres)}`
      );
      const d = await r.json();
      if (!d?.length) return null;

      return { lat: +d[0].lat, lon: +d[0].lon };
    } catch {
      return null;
    }
  };

  const policzKm = (a, b) => {
    const R = 6371;

    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;

    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const policzETA = async (a, b) => {
    try {
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`
      );
      const d = await r.json();

      return d?.routes?.length
        ? Math.round(d.routes[0].duration / 60)
        : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!formularz.adres) {
      setKm("");
      setEta("");
      return;
    }

    const t = setTimeout(async () => {
      const geo = await pobierzGeo(formularz.adres);
      if (!geo) return;

      setKm(policzKm(BASE, geo).toFixed(1));

      const e = await policzETA(BASE, geo);
      if (e !== null) setEta(e);
    }, 600);

    return () => clearTimeout(t);
  }, [formularz.adres]);

  const suma = useMemo(() => {
    const baza =
      licz(formularz.maszynowa) * ceny.maszynowa +
      licz(formularz.reczna) * ceny.reczna +
      licz(formularz.punkty) * ceny.punkty +
      licz(km) * ceny.km;

    return baza + (baza > 0 ? ceny.wyjazd : 0);
  }, [formularz, km, ceny]);

  const zapisz = () => {
    if (!formularz.klient) return alert("Podaj klienta");

    const istnieje = zlecenia.find((o) => o.id === edycjaId);

    const nowe = {
      id: edycjaId || crypto.randomUUID(),
      ...formularz,
      km,
      eta,
      suma,
      status: istnieje?.status || "Nowe",
      data: new Date().toISOString(),
    };

    setZlecenia((p) =>
      edycjaId
        ? p.map((o) => (o.id === edycjaId ? nowe : o))
        : [nowe, ...p]
    );

    setFormularz({
      klient: "",
      adres: "",
      telefon: "",
      dataWizyty: "",
      maszynowa: "",
      reczna: "",
      punkty: "",
    });

    setKm("");
    setEta("");
    setEdycjaId(null);
    setZakladka("zlecenia");
  };

  const zmienStatus = (id, status) => {
    setZlecenia((p) => {
      const znalezione = p.find((o) => o.id === id);

      if (status === "Zakończone") {
        setHistoria((h) => [
          { ...znalezione, dataZakonczenia: new Date().toISOString() },
          ...h,
        ]);

        return p.filter((o) => o.id !== id);
      }

      return p.map((o) =>
        o.id === id ? { ...o, status } : o
      );
    });
  };

  const edytuj = (o) => {
    setFormularz(o);
    setKm(o.km);
    setEta(o.eta);
    setEdycjaId(o.id);
    setZakladka("kalkulator");
  };

  const usun = (id) => {
    if (confirm("Usunąć zlecenie?")) {
      setZlecenia((p) => p.filter((o) => o.id !== id));
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="border p-6 w-80 space-y-3">
          <input className="border p-2 w-full" placeholder="Login"
            value={login} onChange={(e) => setLogin(e.target.value)} />

          <input className="border p-2 w-full" type="password"
            placeholder="Hasło" value={haslo}
            onChange={(e) => setHaslo(e.target.value)} />

          <button onClick={zaloguj}
            className="bg-blue-600 text-white w-full p-2">
            Zaloguj
          </button>
        </div>
      </div>
    );
  }

  const zleceniaSorted = [...zlecenia].sort(
    (a, b) => new Date(a.dataWizyty || 0) - new Date(b.dataWizyty || 0)
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold">Serwis Robotów</h1>

      <div className="flex gap-2 my-4">
        <button onClick={() => setZakladka("kalkulator")}>Kalkulator</button>
        <button onClick={() => setZakladka("zlecenia")}>Zlecenia</button>
        <button onClick={() => setZakladka("historia")}>Historia</button>
        {czyAdmin && <button onClick={() => setZakladka("admin")}>Admin</button>}
      </div>

      {zakladka === "kalkulator" && (
        <div className="border p-4 space-y-2">
          <input placeholder="Klient" value={formularz.klient}
            onChange={(e) => setFormularz({ ...formularz, klient: e.target.value })} />

          <input placeholder="Adres" value={formularz.adres}
            onChange={(e) => setFormularz({ ...formularz, adres: e.target.value })} />

          <input type="datetime-local" value={formularz.dataWizyty}
            onChange={(e) => setFormularz({ ...formularz, dataWizyty: e.target.value })} />

          <div>🚗 {km} km | 🕒 {eta} min</div>
          <div className="font-bold">{suma.toFixed(2)} zł</div>

          <button onClick={zapisz} className="bg-green-600 text-white p-2">
            Zapisz
          </button>
        </div>
      )}

      {zakladka === "zlecenia" && (
        <div className="space-y-3">
          {zleceniaSorted.map((o) => (
            <div key={o.id} className="border p-3">
              <div className="font-bold">{o.klient}</div>
              <div>📞 {o.telefon}</div>

              <div className={`px-2 inline-block ${STATUS_STYLE[o.status]}`}>
                {o.status}
              </div>

              <div>💰 {o.suma} zł</div>

              <button onClick={() => zmienStatus(o.id, "Zakończone")}>Zakończ</button>
              <button onClick={() => edytuj(o)}>Edytuj</button>
              <button onClick={() => usun(o.id)}>Usuń</button>
            </div>
          ))}
        </div>
      )}

      {zakladka === "historia" && (
        <div>
          {historia.map((o) => (
            <div key={o.id} className="border p-2">
              {o.klient} — {o.suma} zł
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
