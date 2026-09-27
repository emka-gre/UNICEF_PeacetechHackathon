import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { useOnline } from "../lib/queue";
import { useDiscreet } from "../lib/safety";
import { load } from "../lib/storage";
import { PhoneIcon, PinIcon } from "../icons";
import { useT } from "../i18n";

interface Contact {
  name: string;
  phone: string;
}

interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
  time: number;
}

const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

function smsLink(phone: string, body: string) {
  // iOS expects "&body=", Android expects "?body=".
  return `sms:${phone}${IOS ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

function whatsappLink(phone: string, body: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(body)}`;
}

// The location is read on the phone and shared directly with the people the user picks
// (SMS, WhatsApp or the share sheet). It is never sent to the Laaha server.
export default function Sos() {
  const discreet = useDiscreet();
  const online = useOnline();
  const t = useT();
  const emergency = load("emergencyNumber", "112");
  const contacts = load<Contact[]>("contacts", []);
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function locate() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError(t.sos.noGeo);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          time: pos.timestamp,
        });
        setLocating(false);
      },
      (err) => {
        setLocError(
          err.code === err.PERMISSION_DENIED ? t.sos.denied : t.sos.notFound,
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  useEffect(locate, []);

  const mapUrl =
    fix &&
    `https://maps.google.com/?q=${fix.lat.toFixed(6)},${fix.lng.toFixed(6)}`;
  const message = fix
    ? t.sos.message(
        mapUrl!,
        Math.round(fix.accuracy),
        new Date(fix.time).toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" }),
      )
    : t.sos.messageNoFix;

  async function share() {
    try {
      await navigator.share({ title: "SOS", text: message });
    } catch {
      /* cancelled */
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="stack">
      <h1>{discreet ? t.sos.titleDiscreet : t.sos.title}</h1>

      {!discreet && (
        <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
          <div>
            <strong>{t.common.emergencyServices}</strong>
            <span>{t.common.inDangerNow}</span>
          </div>
          <span className="call-button">
            <PhoneIcon /> {emergency}
          </span>
        </a>
      )}

      <section className="card stack sos-location">
        <div className="row between">
          <strong>
            <PinIcon /> {t.sos.myLocation}
          </strong>
          <button className="link" onClick={locate} disabled={locating}>
            {locating ? t.sos.finding : t.sos.update}
          </button>
        </div>
        {locating && !fix && <p className="muted">{t.sos.findingLong}</p>}
        {locError && <p className="error">{locError}</p>}
        {fix && (
          <>
            <p className="sos-coords">
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
              <span className="muted">
                {" "}
                · {t.sos.within(Math.round(fix.accuracy))}
              </span>
            </p>
            {online ? (
              <MapContainer
                key={`${fix.lat},${fix.lng}`}
                className="map sos-map"
                center={[fix.lat, fix.lng]}
                zoom={16}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CircleMarker
                  center={[fix.lat, fix.lng]}
                  radius={10}
                  pathOptions={{ color: "#b3261e", fillOpacity: 0.8 }}
                />
              </MapContainer>
            ) : (
              <p className="muted">{t.sos.offlineMap}</p>
            )}
          </>
        )}
        <p className="muted">{t.sos.staysHere}</p>
      </section>

      <h2>{discreet ? t.sos.sendToDiscreet : t.sos.sendTo}</h2>
      <p className="pre sos-message">{message}</p>

      {contacts.length === 0 ? (
        <div className="card">
          <p className="muted">
            {discreet ? t.sos.noContactsDiscreet : t.sos.noContacts}{" "}
            <Link to="/contacts">
              {discreet ? t.sos.addTrustedDiscreet : t.sos.addTrusted}
            </Link>
            {t.sos.orShare}
          </p>
        </div>
      ) : (
        contacts.map((c, i) => (
          <div key={i} className="card helpline trusted">
            <div>
              <strong>{c.name}</strong>
              <span className="muted">{c.phone}</span>
            </div>
            <div className="row">
              <a className="call-button" href={smsLink(c.phone, message)}>
                SMS
              </a>
              <a
                className="call-button"
                href={whatsappLink(c.phone, message)}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>
        ))
      )}

      <div className="row">
        {"share" in navigator && (
          <button className="button danger" onClick={share}>
            {t.sos.shareOther}
          </button>
        )}
        <button className="button ghost" onClick={copy}>
          {copied ? t.sos.copied : t.sos.copy}
        </button>
      </div>
      <p className="muted">{t.sos.smsHint}</p>
    </div>
  );
}
