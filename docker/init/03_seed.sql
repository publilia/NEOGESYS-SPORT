-- ============================================================
-- SEED DATA - Dati demo per sviluppo
-- ============================================================

-- Piani abbonamento
INSERT INTO piani_abbonamento (codice,nome,descrizione,prezzo_mensile,prezzo_annuale,max_soci,max_utenti,max_storage_mb,ai_abilitato,integrazioni_google,integrazioni_microsoft,custom_domain,custom_palette,fatturazione_sdi,export_avanzato,supporto_prioritario,white_label,ordine,colore,highlighted,attivo)
VALUES
  ('free','Free','Gratuito per piccole ASD',0,0,25,2,100,false,false,false,false,false,false,false,false,false,1,'gray',false,true),
  ('base','Base','Per ASD fino a 100 soci',29,290,100,5,500,false,true,false,false,false,true,true,false,false,2,'blue',false,true),
  ('pro','Pro','Club strutturati con AI',79,790,500,20,5000,true,true,true,true,true,true,true,true,false,3,'purple',true,true),
  ('enterprise','Enterprise','Federazioni e grandi club',199,1990,10000,100,50000,true,true,true,true,true,true,true,true,true,4,'amber',false,true)
ON CONFLICT (codice) DO NOTHING;

-- Tenant demo: ASD Demo Sport
INSERT INTO tenants (id,slug,ragione_sociale,tipo_ente,partita_iva,codice_fiscale,pec,piano,stato,nome_visualizzato,palette_default,impostazioni,trial_end)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'demo-asd-sport',
  'ASD Demo Sport',
  'ASD',
  '01234567890',
  '01234567890',
  'info@pec.demo-asd.sport',
  'pro',
  'attivo',
  'ASD Demo Sport',
  'default',
  '{"layout_menu":"sidebar","cert_alert_days":30,"ai_enabled":true,"lingua":"it","timezone":"Europe/Rome"}',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Tenant demo: SSD Olimpia Milano
INSERT INTO tenants (id,slug,ragione_sociale,tipo_ente,piano,stato,nome_visualizzato,palette_default,impostazioni,trial_end)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'ssd-olimpia-milano',
  'SSD Olimpia Milano',
  'SSD',
  'base',
  'attivo',
  'SSD Olimpia Milano',
  'ocean',
  '{"layout_menu":"sidebar","cert_alert_days":30,"ai_enabled":false,"lingua":"it"}',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- Tenant trial: ASD Aquila Roma
INSERT INTO tenants (id,slug,ragione_sociale,tipo_ente,piano,stato,nome_visualizzato,palette_default,impostazioni,trial_end)
VALUES (
  'cccccccc-0000-0000-0000-000000000003',
  'asd-aquila-roma',
  'ASD Aquila Roma',
  'ASD',
  'trial',
  'trial',
  'ASD Aquila Roma',
  'sport',
  '{"layout_menu":"topbar","cert_alert_days":30,"ai_enabled":false,"lingua":"it"}',
  NOW() + INTERVAL '14 days'
) ON CONFLICT (slug) DO NOTHING;

-- Super admin
INSERT INTO utenti (id,email,password_hash,nome,cognome,email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'superadmin@neogesys.sport',
  -- password: SuperAdmin2026!  (bcrypt hash)
  '$2b$10$K.0HwpsoPDMaTeGNEsK7N.dF8K5L1X9Y1z8Y1z8Y1z8Y1z8Y1z8Y',
  'Super',
  'Admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Admin ASD Demo Sport
INSERT INTO utenti (id,email,password_hash,nome,cognome,email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'admin@demo-asd.sport',
  -- password: Admin2026!
  '$2b$10$K.0HwpsoPDMaTeGNEsK7N.dF8K5L1X9Y1z8Y1z8Y1z8Y1z8Y1z8Y',
  'Mario',
  'Rossi',
  true
) ON CONFLICT (email) DO NOTHING;

-- Segreteria
INSERT INTO utenti (id,email,password_hash,nome,cognome,email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'segreteria@demo-asd.sport',
  '$2b$10$K.0HwpsoPDMaTeGNEsK7N.dF8K5L1X9Y1z8Y1z8Y1z8Y1z8Y1z8Y',
  'Anna',
  'Ciliegio',
  true
) ON CONFLICT (email) DO NOTHING;

-- Contabile
INSERT INTO utenti (id,email,password_hash,nome,cognome,email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'contabile@demo-asd.sport',
  '$2b$10$K.0HwpsoPDMaTeGNEsK7N.dF8K5L1X9Y1z8Y1z8Y1z8Y1z8Y1z8Y',
  'Giulia',
  'Ferrari',
  true
) ON CONFLICT (email) DO NOTHING;

-- Istruttore
INSERT INTO utenti (id,email,password_hash,nome,cognome,email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'istruttore@demo-asd.sport',
  '$2b$10$K.0HwpsoPDMaTeGNEsK7N.dF8K5L1X9Y1z8Y1z8Y1z8Y1z8Y1z8Y',
  'Marco',
  'Rinaldi',
  true
) ON CONFLICT (email) DO NOTHING;

-- Atleta
INSERT INTO utenti (id,email,password_hash,nome,cognome,email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'atleta@demo-asd.sport',
  '$2b$10$K.0HwpsoPDMaTeGNEsK7N.dF8K5L1X9Y1z8Y1z8Y1z8Y1z8Y1z8Y',
  'Luigi',
  'Verdi',
  true
) ON CONFLICT (email) DO NOTHING;

-- Link ruoli
INSERT INTO utente_tenant (utente_id,tenant_id,ruolo,attivo) VALUES
  ('00000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','admin',true),
  ('00000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','segreteria',true),
  ('00000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','contabile',true),
  ('00000000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','istruttore',true),
  ('00000000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001','atleta',true)
ON CONFLICT (utente_id, tenant_id) DO NOTHING;

-- Anno sportivo
INSERT INTO anni_sportivi (id,tenant_id,nome,data_inizio,data_fine,attivo)
VALUES (
  'eeeeeeee-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  '2025/2026',
  '2025-09-01',
  '2026-08-31',
  true
) ON CONFLICT DO NOTHING;

-- Tipi quota
INSERT INTO tipi_quota (id,tenant_id,nome,importo,periodicita,attivo)
VALUES
  ('ffffffff-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Iscrizione annuale',50.00,'annuale',true),
  ('ffffffff-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Quota annuale',240.00,'annuale',true),
  ('ffffffff-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Quota mensile',45.00,'mensile',true),
  ('ffffffff-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Quota trimestrale',120.00,'trimestrale',true)
ON CONFLICT DO NOTHING;

-- Soci demo (15 soci)
INSERT INTO soci (id,tenant_id,tessera,nome,cognome,disciplina,stato,email,data_nascita) VALUES
  ('10000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','2026-001','Mario','Rossi','Calcetto','attivo','mario.rossi@demo.it','1990-05-15'),
  ('10000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','2026-002','Luigi','Verdi','Pallavolo','attivo','luigi.verdi@demo.it','1995-08-22'),
  ('10000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','2026-003','Anna','Bianchi','Yoga','attivo','anna.bianchi@demo.it','1988-03-10'),
  ('10000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','2026-004','Giulia','Ferrari','Nuoto','attivo','giulia.ferrari@demo.it','1992-11-30'),
  ('10000000-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','2026-005','Marco','Neri','Karate','sospeso','marco.neri@demo.it','1985-07-04'),
  ('10000000-0000-0000-0000-000000000006','aaaaaaaa-0000-0000-0000-000000000001','2026-006','Laura','Romano','Atletica','attivo','laura.romano@demo.it','1998-01-25'),
  ('10000000-0000-0000-0000-000000000007','aaaaaaaa-0000-0000-0000-000000000001','2026-007','Paolo','Conti','Pallavolo','sospeso','paolo.conti@demo.it','1987-09-12'),
  ('10000000-0000-0000-0000-000000000008','aaaaaaaa-0000-0000-0000-000000000001','2026-008','Sara','Rizzo','Nuoto','attivo','sara.rizzo@demo.it','2000-04-18'),
  ('10000000-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000001','2026-009','Luca','Marino','Calcetto','attivo','luca.marino@demo.it','1993-12-07'),
  ('10000000-0000-0000-0000-000000000010','aaaaaaaa-0000-0000-0000-000000000001','2026-010','Valentina','Bruno','Yoga','attivo','valentina.bruno@demo.it','1997-06-20')
ON CONFLICT DO NOTHING;

-- Corsi demo
INSERT INTO corsi (id,tenant_id,nome,disciplina,max_iscritti,luogo,stato) VALUES
  ('20000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Atletica Leggera','Atletica',30,'Campo Comunale','attivo'),
  ('20000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Nuoto Bambini','Nuoto',20,'Piscina Comunale','attivo'),
  ('20000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Pallavolo Giovanile','Pallavolo',25,'Palazzetto','attivo'),
  ('20000000-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Yoga Mattutino','Yoga',20,'Sala A','attivo')
ON CONFLICT DO NOTHING;

-- Quote demo
INSERT INTO quote (tenant_id,socio_id,tipo_quota_id,anno_sportivo_id,importo,stato,data_scadenza,data_pagamento) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000001',240.00,'pagata','2025-09-15','2025-09-10'),
  ('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','ffffffff-0000-0000-0000-000000000003',NULL,45.00,'da_pagare','2026-05-05',NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','ffffffff-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000001',240.00,'pagata','2025-09-15','2025-09-12'),
  ('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','ffffffff-0000-0000-0000-000000000004',NULL,120.00,'parziale','2026-04-20',NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','ffffffff-0000-0000-0000-000000000003',NULL,45.00,'scaduta','2025-09-05',NULL);

-- Movimenti prima nota demo
INSERT INTO prima_nota_movimenti (tenant_id,data_movimento,descrizione,categoria,tipo,importo) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','2026-04-15','Quote aprile - batch','Entrate Quote','entrata',1890.00),
  ('aaaaaaaa-0000-0000-0000-000000000001','2026-04-12','Affitto palazzetto aprile','Uscite Fisse','uscita',800.00),
  ('aaaaaaaa-0000-0000-0000-000000000001','2026-04-10','Iscrizioni torneo primavera','Entrate Eventi','entrata',450.00),
  ('aaaaaaaa-0000-0000-0000-000000000001','2026-04-08','Compenso istruttori aprile','Uscite Personale','uscita',1200.00),
  ('aaaaaaaa-0000-0000-0000-000000000001','2026-04-05','Materiale sportivo','Uscite Attrezzature','uscita',420.00);

-- Eventi demo
INSERT INTO eventi (tenant_id,nome,descrizione,data_inizio,data_fine,luogo,tipo,stato) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','Torneo Primavera Pallavolo','Torneo interregionale under 18','2026-04-20 09:00:00+02','2026-04-20 18:00:00+02','Palazzetto Comunale','torneo','programmato'),
  ('aaaaaaaa-0000-0000-0000-000000000001','Gara Regionale Atletica','Campionato regionale categorie','2026-05-02 08:00:00+02','2026-05-02 20:00:00+02','Stadio A. Moro','gara','programmato'),
  ('aaaaaaaa-0000-0000-0000-000000000001','Stage Karate con Maestro','Seminario tecnico avanzato','2026-05-10 10:00:00+02','2026-05-10 17:00:00+02','Dojo Centrale','stage','programmato');

SELECT 'SEED completato: ' ||
  (SELECT COUNT(*) FROM tenants) || ' tenants, ' ||
  (SELECT COUNT(*) FROM utenti) || ' utenti, ' ||
  (SELECT COUNT(*) FROM soci) || ' soci' AS result;
