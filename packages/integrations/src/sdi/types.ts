/**
 * SDI - Sistema di Interscambio (Italian electronic invoicing system)
 * Fatturazione Elettronica
 */

export interface FatturaElettronica {
  numero: string;
  data: Date;
  cedentePrestatore: {
    denominazione: string;
    partitaIva: string;
    codiceFiscale?: string;
    indirizzo: {
      via: string;
      cap: string;
      citta: string;
      provincia: string;
      nazione: string;
    };
  };
  cessionarioCommittente: {
    denominazione: string;
    codiceFiscale: string;
    partitaIva?: string;
    indirizzo: {
      via: string;
      cap: string;
      citta: string;
      provincia: string;
      nazione: string;
    };
  };
  linee: Array<{
    descrizione: string;
    quantita: number;
    prezzoUnitario: number;
    prezzoTotale: number;
    aliquotaIva: number;
  }>;
  totaleImponibile: number;
  totaleImposta: number;
  totaleFattura: number;
  modalitaPagamento: string; // MP01 = contanti, MP05 = bonifico, etc.
  condizioniPagamento: string; // TP01 = rata, TP02 = completo
}

export interface SDISendResult {
  identificativoSdi: string;
  stato: "accettata" | "inviata" | "rifiutata" | "errore";
  dataInvio: Date;
  errore?: string;
}

export interface SDIStatusResult {
  identificativoSdi: string;
  stato: "accettata" | "consegnata" | "mancata_consegna" | "rifiutata" | "scartata";
  notifiche: Array<{
    tipo: string;
    data: Date;
    descrizione: string;
  }>;
}

export interface SDIProvider {
  /**
   * Generate XML in the FatturaPA format.
   */
  generateXML(fattura: FatturaElettronica): string;

  /**
   * Send an electronic invoice to SDI.
   */
  send(fattura: FatturaElettronica): Promise<SDISendResult>;

  /**
   * Check the status of a previously sent invoice.
   */
  getStatus(identificativoSdi: string): Promise<SDIStatusResult>;
}

export type SDIProviderType = "aruba" | "infocert" | "custom";
