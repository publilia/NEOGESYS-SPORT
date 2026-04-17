"use client";

import { useState } from "react";
import {
  CreditCard,
  Mail,
  Smartphone,
  FileText,
  Bot,
  HardDrive,
  Calendar,
  Search,
  Trophy,
  CheckCircle2,
  XCircle,
  Circle,
  Settings,
  PlayCircle,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from "lucide-react";

type StatoIntegrazione = "connesso" | "disconnesso" | "errore";
type TestResult = "ok" | "errore" | "non_testato";

interface Provider {
  id: string;
  nome: string;
  stato: StatoIntegrazione;
  testResult: TestResult;
  descrizione: string;
}

interface SezioneIntegrazione {
  id: string;
  titolo: string;
  icona: string;
  icon: typeof CreditCard;
  providers: Provider[];
}

const STATO_COLORS: Record<StatoIntegrazione, string> = {
  connesso: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  disconnesso: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  errore: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATO_LABELS: Record<StatoIntegrazione, string> = {
  connesso: "Connesso",
  disconnesso: "Disconnesso",
  errore: "Errore",
};

const TEST_ICONS: Record<TestResult, typeof CheckCircle2> = {
  ok: CheckCircle2,
  errore: XCircle,
  non_testato: Circle,
};

const TEST_COLORS: Record<TestResult, string> = {
  ok: "text-green-600 dark:text-green-400",
  errore: "text-red-600 dark:text-red-400",
  non_testato: "text-gray-400 dark:text-gray-500",
};

const SEZIONI: SezioneIntegrazione[] = [
  {
    id: "pagamenti",
    titolo: "Pagamenti",
    icona: "credit-card",
    icon: CreditCard,
    providers: [
      { id: "stripe", nome: "Stripe", stato: "connesso", testResult: "ok", descrizione: "Pagamenti con carta di credito e addebito diretto" },
      { id: "satispay", nome: "SatisPay", stato: "disconnesso", testResult: "non_testato", descrizione: "Pagamenti digitali tramite app SatisPay" },
    ],
  },
  {
    id: "email",
    titolo: "Email",
    icona: "mail",
    icon: Mail,
    providers: [
      { id: "resend", nome: "Resend", stato: "connesso", testResult: "ok", descrizione: "Servizio email transazionale moderno" },
      { id: "ses", nome: "Amazon SES", stato: "disconnesso", testResult: "non_testato", descrizione: "Simple Email Service di Amazon Web Services" },
      { id: "postmark", nome: "Postmark", stato: "disconnesso", testResult: "non_testato", descrizione: "Email transazionali ad alta deliverability" },
      { id: "smtp", nome: "SMTP Personalizzato", stato: "disconnesso", testResult: "non_testato", descrizione: "Configurazione server SMTP personalizzato" },
    ],
  },
  {
    id: "sms_whatsapp",
    titolo: "SMS / WhatsApp",
    icona: "smartphone",
    icon: Smartphone,
    providers: [
      { id: "twilio", nome: "Twilio", stato: "disconnesso", testResult: "non_testato", descrizione: "SMS e chiamate vocali globali" },
      { id: "skebby", nome: "Skebby", stato: "disconnesso", testResult: "non_testato", descrizione: "Gateway SMS italiano" },
      { id: "whatsapp", nome: "WhatsApp Business", stato: "disconnesso", testResult: "non_testato", descrizione: "Messaggi WhatsApp tramite API ufficiale" },
    ],
  },
  {
    id: "sdi",
    titolo: "SDI - Fatturazione Elettronica",
    icona: "file-text",
    icon: FileText,
    providers: [
      { id: "aruba", nome: "Aruba", stato: "disconnesso", testResult: "non_testato", descrizione: "Fatturazione elettronica tramite Aruba" },
      { id: "fatture_in_cloud", nome: "Fatture in Cloud", stato: "disconnesso", testResult: "non_testato", descrizione: "Piattaforma di fatturazione online" },
      { id: "acube", nome: "Acube", stato: "disconnesso", testResult: "non_testato", descrizione: "API per fatturazione elettronica SDI" },
    ],
  },
  {
    id: "ai",
    titolo: "AI - Intelligenza Artificiale",
    icona: "bot",
    icon: Bot,
    providers: [
      { id: "anthropic", nome: "Anthropic", stato: "connesso", testResult: "ok", descrizione: "Modelli Claude per analisi predittiva e assistenza" },
      { id: "openai", nome: "OpenAI", stato: "disconnesso", testResult: "non_testato", descrizione: "Modelli GPT per elaborazione testo" },
    ],
  },
  {
    id: "cloud_storage",
    titolo: "Cloud Storage",
    icona: "hard-drive",
    icon: HardDrive,
    providers: [
      { id: "google_drive", nome: "Google Drive", stato: "disconnesso", testResult: "non_testato", descrizione: "Archiviazione documenti su Google Drive" },
      { id: "onedrive", nome: "Microsoft OneDrive", stato: "disconnesso", testResult: "non_testato", descrizione: "Archiviazione documenti su OneDrive" },
    ],
  },
  {
    id: "calendario",
    titolo: "Calendario",
    icona: "calendar",
    icon: Calendar,
    providers: [
      { id: "google_calendar", nome: "Google Calendar", stato: "disconnesso", testResult: "non_testato", descrizione: "Sincronizzazione eventi con Google Calendar" },
      { id: "outlook", nome: "Microsoft Outlook", stato: "disconnesso", testResult: "non_testato", descrizione: "Sincronizzazione eventi con Outlook Calendar" },
    ],
  },
  {
    id: "ricerca",
    titolo: "Ricerca",
    icona: "search",
    icon: Search,
    providers: [
      { id: "typesense", nome: "Typesense", stato: "connesso", testResult: "ok", descrizione: "Motore di ricerca full-text ad alte prestazioni" },
    ],
  },
  {
    id: "federazioni",
    titolo: "Federazioni",
    icona: "trophy",
    icon: Trophy,
    providers: [
      { id: "export_csv", nome: "Export CSV Federazioni", stato: "connesso", testResult: "ok", descrizione: "Esportazione dati nel formato richiesto dalle federazioni sportive" },
    ],
  },
];

export default function IntegrazioniPage() {
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    SEZIONI.forEach((s) =>
      s.providers.forEach((p) => {
        states[p.id] = p.stato === "connesso";
      }),
    );
    return states;
  });

  const handleToggle = (providerId: string) => {
    setToggleStates((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Integrazioni
          </h1>
          <p className="text-muted-foreground">
            Configura i servizi esterni collegati alla piattaforma
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/10">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Le credenziali e i costi del servizio sono responsabilita del cliente.
          Ogni integrazione richiede un account attivo presso il provider corrispondente.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SEZIONI.map((sezione) => {
          const SectionIcon = sezione.icon;
          return (
            <div key={sezione.id}>
              <div className="mb-4 flex items-center gap-2">
                <SectionIcon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{sezione.titolo}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sezione.providers.map((provider) => {
                  const TestIcon = TEST_ICONS[provider.testResult];
                  const isEnabled = toggleStates[provider.id];
                  return (
                    <div
                      key={provider.id}
                      className={`rounded-xl border bg-card p-5 ${
                        isEnabled ? "border-primary/30" : "border-border"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{provider.nome}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">{provider.descrizione}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATO_COLORS[provider.stato]}`}
                        >
                          {STATO_LABELS[provider.stato]}
                        </span>
                      </div>

                      <div className="mb-4 flex items-center gap-2">
                        <TestIcon className={`h-4 w-4 ${TEST_COLORS[provider.testResult]}`} />
                        <span className="text-xs text-muted-foreground">
                          {provider.testResult === "ok"
                            ? "Test superato"
                            : provider.testResult === "errore"
                              ? "Test fallito"
                              : "Non testato"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Configura
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          Testa
                        </button>
                        <button
                          type="button"
                          className="ml-auto inline-flex items-center"
                          onClick={() => handleToggle(provider.id)}
                          title={isEnabled ? "Disattiva" : "Attiva"}
                        >
                          {isEnabled ? (
                            <ToggleRight className="h-6 w-6 text-primary" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
