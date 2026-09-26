import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { useOnline } from "../lib/queue";
import { useDiscreet } from "../lib/safety";
import { load } from "../lib/storage";
import { PhoneIcon, PinIcon } from "../icons";

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
  const emergency = load("emergencyNumber", "112");
  const contacts = load<Contact[]>("contacts", []);
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function locate() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError(
        "This phone cannot share its location. You can still send a message or call.",
      );
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
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for this app. Allow it in your browser settings, or send a message without it."
            : "Could not find your location. Try again outside or near a window, or send a message without it.",
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
    ? `I need help. This is where I am: ${mapUrl} (within about ${Math.round(fix.accuracy)} m, at ${new Date(fix.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}). Please call me or send help.`
    : "I need help. Please call me or send help.";

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
      <h1>{discreet ? "Share location" : "SOS"}</h1>

      {!discreet && (
        <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
          <div>
            <strong>Emergency services</strong>
            <span>If you are in danger right now</span>
          </div>
          <span className="call-button">
            <PhoneIcon /> {emergency}
          </span>
        </a>
      )}

      <section className="card stack sos-location">
        <div className="row between">
          <strong>
            <PinIcon /> My location
          </strong>
          <button className="link" onClick={locate} disabled={locating}>
            {locating ? "Finding…" : "Update"}
          </button>
        </div>
        {locating && !fix && <p className="muted">Finding your location…</p>}
        {locError && <p className="error">{locError}</p>}
        {fix && (
          <>
            <p className="sos-coords">
              {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
              <span className="muted">
                {" "}
                · within about {Math.round(fix.accuracy)} m
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
              <p className="muted">
                You are offline, so the map is hidden. Your location still works
                and can be sent by SMS.
              </p>
            )}
          </>
        )}
        <p className="muted">
          Your location stays on this phone. It is only sent to the people you
          choose below.
        </p>
      </section>

      <h2>{discreet ? "Send to" : "Send my location"}</h2>
      <p className="pre sos-message">{message}</p>

      {contacts.length === 0 ? (
        <div className="card">
          <p className="muted">
            You have no {discreet ? "favourites" : "trusted people"} saved yet.{" "}
            <Link to="/contacts">
              {discreet ? "Add someone" : "Add someone you trust"}
            </Link>
            , or share your location with any app below.
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
            Share with another app
          </button>
        )}
        <button className="button ghost" onClick={copy}>
          {copied ? "Copied" : "Copy message"}
        </button>
      </div>
      <p className="muted">
        SMS works without internet. WhatsApp needs a connection.
      </p>
    </div>
  );
}
