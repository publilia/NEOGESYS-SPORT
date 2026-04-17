"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Upload,
  File,
  FileImage,
  FilePlus,
  Trash2,
  Search,
} from "lucide-react";

interface Documento {
  id: string;
  nome: string;
  tipo: string;
  dimensione: string;
  dataCaricamento: string;
  categoria: string;
}

const documenti: Documento[] = [
  {
    id: "d1",
    nome: "Tessera_2025_2026.pdf",
    tipo: "application/pdf",
    dimensione: "245 KB",
    dataCaricamento: "01/09/2025",
    categoria: "Tessere",
  },
  {
    id: "d2",
    nome: "Certificato_Agonistico_2025.pdf",
    tipo: "application/pdf",
    dimensione: "1.2 MB",
    dataCaricamento: "15/05/2025",
    categoria: "Certificati",
  },
  {
    id: "d3",
    nome: "Ricevuta_Iscrizione_2025.pdf",
    tipo: "application/pdf",
    dimensione: "98 KB",
    dataCaricamento: "10/09/2025",
    categoria: "Ricevute",
  },
  {
    id: "d4",
    nome: "Foto_Tessera.jpg",
    tipo: "image/jpeg",
    dimensione: "320 KB",
    dataCaricamento: "01/09/2025",
    categoria: "Personale",
  },
  {
    id: "d5",
    nome: "Modulo_Privacy_Firmato.pdf",
    tipo: "application/pdf",
    dimensione: "156 KB",
    dataCaricamento: "01/09/2025",
    categoria: "Modulistica",
  },
];

function FileIcon({ tipo }: { tipo: string }) {
  if (tipo.startsWith("image/")) return <FileImage className="h-5 w-5 text-purple-500" />;
  if (tipo === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export default function DocumentiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const filteredDocs = documenti.filter((doc) =>
    doc.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.categoria.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const categorie = [...new Set(documenti.map((d) => d.categoria))];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">I miei documenti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Documenti personali, tessere, ricevute e modulistica
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cerca documenti..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            searchQuery === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Tutti
        </button>
        {categorie.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSearchQuery(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              searchQuery === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30"
            >
              <FileIcon tipo={doc.tipo} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {doc.categoria} - {doc.dimensione} - {doc.dataCaricamento}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  title="Scarica"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredDocs.length === 0 && (
            <div className="px-5 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nessun documento trovato
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upload zone */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Carica documento</h2>
        <div
          className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            // TODO: Handle file upload
          }}
        >
          <FilePlus className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Trascina il file qui oppure
          </p>
          <button
            type="button"
            className="mt-2 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Seleziona file
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            PDF, JPG, PNG o DOC, massimo 10 MB
          </p>
        </div>
      </div>
    </div>
  );
}
