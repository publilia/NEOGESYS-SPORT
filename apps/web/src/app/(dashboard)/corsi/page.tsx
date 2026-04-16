"use client";

import { Users, Clock, MapPin, ChevronRight, CalendarDays } from "lucide-react";
import Link from "next/link";

interface Corso {
  id: string;
  nome: string;
  disciplina: string;
  istruttore: string;
  giorno: string;
  orario: string;
  luogo: string;
  iscrittiAttuali: number;
  capacitaMassima: number;
}

const SAMPLE_CORSI: Corso[] = [
  {
    id: "1",
    nome: "Calcio Under 12",
    disciplina: "Calcio",
    istruttore: "Marco Bianchi",
    giorno: "Lunedi e Mercoledi",
    orario: "16:00 - 17:30",
    luogo: "Campo A",
    iscrittiAttuali: 18,
    capacitaMassima: 20,
  },
  {
    id: "2",
    nome: "Nuoto Principianti",
    disciplina: "Nuoto",
    istruttore: "Laura Verdi",
    giorno: "Martedi e Giovedi",
    orario: "14:00 - 15:00",
    luogo: "Piscina Coperta",
    iscrittiAttuali: 10,
    capacitaMassima: 15,
  },
  {
    id: "3",
    nome: "Tennis Adulti",
    disciplina: "Tennis",
    istruttore: "Paolo Rossi",
    giorno: "Mercoledi e Venerdi",
    orario: "18:00 - 19:30",
    luogo: "Campo Tennis 1",
    iscrittiAttuali: 6,
    capacitaMassima: 8,
  },
  {
    id: "4",
    nome: "Pallavolo Agonistica",
    disciplina: "Pallavolo",
    istruttore: "Chiara Neri",
    giorno: "Lunedi, Mercoledi, Venerdi",
    orario: "17:00 - 19:00",
    luogo: "Palestra Principale",
    iscrittiAttuali: 12,
    capacitaMassima: 14,
  },
  {
    id: "5",
    nome: "Ginnastica Artistica",
    disciplina: "Ginnastica",
    istruttore: "Francesca Blu",
    giorno: "Martedi e Sabato",
    orario: "10:00 - 12:00",
    luogo: "Sala Ginnastica",
    iscrittiAttuali: 8,
    capacitaMassima: 20,
  },
];

function CapacityBar({ current, max }: { current: number; max: number }) {
  const percentage = (current / max) * 100;
  const color =
    percentage >= 90
      ? "bg-red-500"
      : percentage >= 70
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {current}/{max}
      </span>
    </div>
  );
}

export default function CorsiPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Corsi
          </h1>
          <p className="text-muted-foreground">
            Gestisci i corsi e le attivita sportive
          </p>
        </div>
        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <CalendarDays className="h-4 w-4" />
          Vedi Calendario
        </Link>
      </div>

      {/* Courses grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_CORSI.map((corso) => (
          <div
            key={corso.id}
            className="group rounded-xl border border-border bg-card p-5 hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{corso.nome}</h3>
                <p className="text-sm text-primary">{corso.disciplina}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </div>

            <div className="mb-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{corso.istruttore}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {corso.giorno} &middot; {corso.orario}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{corso.luogo}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Iscritti</p>
              <CapacityBar
                current={corso.iscrittiAttuali}
                max={corso.capacitaMassima}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
