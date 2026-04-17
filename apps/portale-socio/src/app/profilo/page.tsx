"use client";

import { useState } from "react";
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Shield,
  Save,
  Download,
  Trash2,
} from "lucide-react";

interface PrivacyToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function ProfiloPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [privacyToggles, setPrivacyToggles] = useState<PrivacyToggle[]>([
    {
      id: "newsletter",
      label: "Newsletter e comunicazioni",
      description: "Ricevi aggiornamenti su eventi, corsi e novita",
      enabled: true,
    },
    {
      id: "foto",
      label: "Pubblicazione foto",
      description: "Consenti la pubblicazione delle tue foto durante gli eventi",
      enabled: false,
    },
    {
      id: "elenco",
      label: "Visibilita in elenco soci",
      description: "Mostra il tuo nome nell'elenco soci pubblico",
      enabled: true,
    },
    {
      id: "marketing",
      label: "Comunicazioni promozionali",
      description: "Ricevi offerte e promozioni dai partner",
      enabled: false,
    },
  ]);

  const handleToggle = (id: string) => {
    setPrivacyToggles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save profile via API
      await new Promise((r) => setTimeout(r, 1000));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Il mio profilo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualizza e modifica i tuoi dati personali
          </p>
        </div>
        <button
          type="button"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : isEditing ? (
            <>
              <Save className="h-4 w-4" />
              Salva modifiche
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              Modifica profilo
            </>
          )}
        </button>
      </div>

      {/* Profile photo & basic info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-10 w-10" />
            </div>
            {isEditing && (
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-foreground">
              Marco Rossi
            </h2>
            <p className="text-sm text-muted-foreground">
              Tessera n. 2024-0142 - Socio dal 15/09/2022
            </p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
              Socio attivo
            </span>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Contatti</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <input
              type="email"
              defaultValue="marco.rossi@esempio.it"
              disabled={!isEditing}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Telefono
            </label>
            <input
              type="tel"
              defaultValue="+39 333 1234567"
              disabled={!isEditing}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Indirizzo
            </label>
            <input
              type="text"
              defaultValue="Via Roma 42, 20100 Milano (MI)"
              disabled={!isEditing}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Privacy Toggles */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Privacy e consensi
          </h3>
        </div>
        <div className="mt-4 divide-y divide-border">
          {privacyToggles.map((toggle) => (
            <div
              key={toggle.id}
              className="flex items-center justify-between py-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {toggle.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {toggle.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={toggle.enabled}
                onClick={() => handleToggle(toggle.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  toggle.enabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    toggle.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* GDPR Actions */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">
          Diritti GDPR
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci i tuoi dati personali in conformita al Regolamento Europeo
          sulla protezione dei dati.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/50"
          >
            <Download className="h-4 w-4" />
            Scarica i miei dati
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Richiedi cancellazione dati
          </button>
        </div>
      </div>
    </div>
  );
}
