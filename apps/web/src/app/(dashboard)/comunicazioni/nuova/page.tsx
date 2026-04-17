"use client";

import { useState } from "react";
import {
  Mail,
  Smartphone,
  MessageSquare,
  Send,
  Clock,
  ArrowLeft,
  Users,
  BookOpen,
  Dumbbell,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

type Canale = "email" | "sms" | "whatsapp";
type Audience = "tutti" | "per_corso" | "per_disciplina" | "manuale";

const CANALE_CONFIG: Record<Canale, { label: string; icon: typeof Mail; description: string }> = {
  email: { label: "Email", icon: Mail, description: "Invia un messaggio email con oggetto e corpo" },
  sms: { label: "SMS", icon: Smartphone, description: "Invia un breve messaggio di testo" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, description: "Invia un messaggio tramite WhatsApp" },
};

const AUDIENCE_CONFIG: Record<Audience, { label: string; icon: typeof Users; description: string }> = {
  tutti: { label: "Tutti i soci", icon: Users, description: "Invia a tutti i soci attivi" },
  per_corso: { label: "Per corso", icon: BookOpen, description: "Seleziona uno o piu corsi" },
  per_disciplina: { label: "Per disciplina", icon: Dumbbell, description: "Seleziona una disciplina" },
  manuale: { label: "Selezione manuale", icon: UserPlus, description: "Scegli i destinatari singolarmente" },
};

const SAMPLE_TEMPLATES = [
  { id: "1", nome: "Promemoria pagamento" },
  { id: "2", nome: "Rinnovo tessera" },
  { id: "3", nome: "Convocazione assemblea" },
  { id: "4", nome: "Comunicazione generica" },
  { id: "5", nome: "Auguri festivita" },
];

const SAMPLE_CORSI = [
  "Calcio Under 12",
  "Nuoto Principianti",
  "Tennis Adulti",
  "Pallavolo Agonistica",
  "Ginnastica Artistica",
];

const SAMPLE_DISCIPLINE = [
  "Calcio",
  "Nuoto",
  "Tennis",
  "Pallavolo",
  "Ginnastica",
  "Basket",
];

export default function NuovaComunicazionePage() {
  const [canale, setCanale] = useState<Canale>("email");
  const [audience, setAudience] = useState<Audience>("tutti");
  const [oggetto, setOggetto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [template, setTemplate] = useState("");
  const [corsoSelezionato, setCorsoSelezionato] = useState("");
  const [disciplinaSelezionata, setDisciplinaSelezionata] = useState("");
  const [dataProgrammata, setDataProgrammata] = useState("");
  const [oraProgrammata, setOraProgrammata] = useState("");

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/comunicazioni"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Nuova Comunicazione
            </h1>
            <p className="text-muted-foreground">
              Componi e invia un messaggio ai tuoi soci
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Canale */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Canale di invio
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(CANALE_CONFIG) as Canale[]).map((c) => {
                const config = CANALE_CONFIG[c];
                const Icon = config.icon;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                      canale === c
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setCanale(c)}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{config.label}</span>
                    <span className="text-xs text-muted-foreground">{config.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destinatari */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Destinatari
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(AUDIENCE_CONFIG) as Audience[]).map((a) => {
                const config = AUDIENCE_CONFIG[a];
                const Icon = config.icon;
                return (
                  <button
                    key={a}
                    type="button"
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                      audience === a
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setAudience(a)}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      audience === a ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{config.label}</span>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Audience sub-selectors */}
            {audience === "per_corso" && (
              <div className="mt-4">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={corsoSelezionato}
                  onChange={(e) => setCorsoSelezionato(e.target.value)}
                >
                  <option value="">Seleziona un corso</option>
                  {SAMPLE_CORSI.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {audience === "per_disciplina" && (
              <div className="mt-4">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={disciplinaSelezionata}
                  onChange={(e) => setDisciplinaSelezionata(e.target.value)}
                >
                  <option value="">Seleziona una disciplina</option>
                  {SAMPLE_DISCIPLINE.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {audience === "manuale" && (
              <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Cerca e seleziona i soci manualmente (funzionalita in arrivo)
              </div>
            )}
          </div>

          {/* Messaggio */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Messaggio
            </h2>
            <div className="space-y-4">
              {canale === "email" && (
                <div>
                  <label htmlFor="oggetto" className="mb-1.5 block text-sm font-medium text-foreground">
                    Oggetto
                  </label>
                  <input
                    id="oggetto"
                    type="text"
                    placeholder="Inserisci l'oggetto dell'email..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={oggetto}
                    onChange={(e) => setOggetto(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label htmlFor="corpo" className="mb-1.5 block text-sm font-medium text-foreground">
                  Corpo del messaggio
                </label>
                <textarea
                  id="corpo"
                  rows={8}
                  placeholder="Scrivi il contenuto del messaggio..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Template */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Template
            </h2>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              <option value="">Seleziona un template...</option>
              {SAMPLE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              I template preimpostati compilano automaticamente il messaggio
            </p>
          </div>

          {/* Programmazione */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Programmazione
            </h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="data-programmata" className="mb-1.5 block text-sm font-medium text-foreground">
                  Data
                </label>
                <input
                  id="data-programmata"
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={dataProgrammata}
                  onChange={(e) => setDataProgrammata(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ora-programmata" className="mb-1.5 block text-sm font-medium text-foreground">
                  Ora
                </label>
                <input
                  id="ora-programmata"
                  type="time"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={oraProgrammata}
                  onChange={(e) => setOraProgrammata(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
              Invia Ora
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Clock className="h-4 w-4" />
              Programma Invio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
