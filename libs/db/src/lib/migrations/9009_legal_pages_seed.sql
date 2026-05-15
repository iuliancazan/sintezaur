-- Postflight: seed initial Romanian drafts for the 6 legal/info pages
-- (M6-A). Idempotent on `slug` — re-running won't overwrite admin edits.
-- Texts are drafts: operator = persoană fizică (Iulian Cazan), without
-- registered firm. CUI / sediu fizic stay as `[ADRESĂ - de completat]`
-- placeholders until the legal form changes.
--
-- Admins edit these via dashboard `/legal` page; updated_at + updated_by
-- track changes.

INSERT INTO legal_pages (slug, title, meta_description, body_md) VALUES
  ('termeni',
   'Termeni și Condiții',
   'Termenii și condițiile de utilizare a platformei Sintezaur — drepturi, responsabilități, conduită.',
   $md$# Termeni și Condiții de Utilizare

## 1. Cine suntem

Sintezaur (sintezaur.ro) este o platformă online dedicată comunității producătorilor de muzică electronică din România. Platforma include:

- **Tezaur** — enciclopedie de echipamente muzicale
- **Bazar** — piață peer-to-peer de echipamente
- **Revista** — publicație online despre tehnologie muzicală
- **Forum** — discuții comunitare

Operatorul platformei este **Iulian Cazan**, persoană fizică, cu reședința în România. Date de contact: contact@sintezaur.ro.

## 2. Acceptarea termenilor

Prin accesarea și utilizarea Sintezaur, declari că ai citit, înțeles și ești de acord cu acești Termeni. Dacă nu ești de acord, te rugăm să nu folosești platforma.

Avem dreptul de a modifica acești Termeni oricând. Modificările intră în vigoare la momentul publicării. Continuarea utilizării după modificare constituie acceptarea noii versiuni.

## 3. Cont de utilizator

Pentru a publica conținut (anunțuri, postări forum, articole), trebuie să îți creezi un cont. Ești responsabil pentru:

- Furnizarea de date corecte și actualizate
- Păstrarea în siguranță a parolei
- Toate activitățile efectuate din contul tău

Ne rezervăm dreptul de a suspenda sau șterge conturi care încalcă acești Termeni sau Regulamentul Forumului.

## 4. Conținutul utilizatorilor

### 4.1 Proprietatea conținutului

Conținutul publicat de tine (texte, fotografii, anunțuri) rămâne proprietatea ta. Prin publicare, ne acorzi o licență neexclusivă, gratuită și mondială de a-l afișa, distribui și promova pe platformă.

### 4.2 Conținut interzis

Este interzisă publicarea de conținut care:

- Încalcă drepturi de autor sau de proprietate intelectuală
- Conține elemente ilegale, frauduloase, ofensatoare sau discriminatorii
- Promovează violența, ura sau discriminarea
- Conține date personale ale terților fără acordul lor
- Reprezintă spam, publicitate neautorizată sau scheme piramidale

## 5. Bazar — Tranzacții între utilizatori

Sintezaur este un intermediar care facilitează contactul între cumpărători și vânzători. **Nu suntem parte la tranzacții.** Plățile, livrarea și conformitatea bunurilor sunt responsabilitatea exclusivă a părților implicate.

Recomandăm:

- Verificarea echipamentului la întâlnirea fizică
- Folosirea metodelor sigure de plată
- Utilizarea curierilor cu confirmare de livrare
- Raportarea utilizatorilor suspecți

Nu garantăm acuratețea anunțurilor și nu suntem responsabili pentru pierderi cauzate de tranzacții între utilizatori.

## 6. Tezaur și Revista — Conținut editorial

Datele despre echipamente din Tezaur și articolele din Revista sunt curate cu cea mai mare grijă, dar nu garantăm acuratețea completă. Specificațiile tehnice pot diferi de informațiile oficiale ale producătorilor.

## 7. Forum

Discuțiile pe Forum sunt guvernate de [Regulamentul Forumului](/regulament-forum). Moderatorii pot edita, ascunde sau șterge postări care încalcă regulamentul.

## 8. Limitarea răspunderii

În măsura permisă de lege, Sintezaur și operatorul nu pot fi ținuți responsabili pentru:

- Pierderi financiare rezultate din tranzacții între utilizatori
- Pierderi sau alterări de date
- Întreruperi de serviciu
- Conținut publicat de utilizatori

Platforma este oferită „așa cum este", fără garanții explicite sau implicite.

## 9. Proprietate intelectuală

Numele „Sintezaur", logo-ul, designul și structura platformei sunt protejate de drepturile de autor. Conținutul editorial din Tezaur și Revista este publicat sub o licență care permite utilizarea necomercială cu atribuire (Creative Commons BY-NC 4.0), dacă nu se specifică altfel pe pagina respectivă.

## 10. Suspendare și încetare

Putem suspenda sau șterge contul tău dacă:

- Încalci acești Termeni
- Încalci Regulamentul Forumului
- Folosești platforma în scopuri frauduloase
- Ești inactiv timp îndelungat

Poți închide contul oricând din pagina ta de cont.

## 11. Legea aplicabilă

Acești Termeni sunt guvernați de legea română. Orice dispută va fi rezolvată de instanțele competente din România.

## 12. Contact

Pentru întrebări despre Termeni: contact@sintezaur.ro sau folosește formularul din pagina [Contact](/contact).
$md$),

  ('confidentialitate',
   'Politica de Confidențialitate',
   'Cum colectăm, folosim și protejăm datele tale personale conform GDPR.',
   $md$# Politica de Confidențialitate

Această politică explică cum colectăm, folosim și protejăm datele tale personale când folosești Sintezaur, conform Regulamentului General privind Protecția Datelor (GDPR — UE 2016/679).

## 1. Operatorul datelor

**Iulian Cazan**, persoană fizică, cu reședința în România.
Date de contact: contact@sintezaur.ro

## 2. Ce date colectăm

### 2.1 Date pe care le furnizezi direct

- **La înregistrare:** nume utilizator, email, parolă (criptată)
- **În profil (opțional):** nume, biografie, avatar, locație, monedă preferată
- **La publicare:** anunțuri, postări forum, articole, recenzii, mesaje
- **La contact:** nume, email, mesajul tău, categoria selectată

### 2.2 Date colectate automat

- **Tehnice:** adresă IP, tip de browser, sistem de operare
- **De navigare:** pagini vizitate, momentul vizitei
- **Cookies:** detalii în [Politica de Cookies](/cookies)

### 2.3 Date pe care **NU** le colectăm

- Nu colectăm informații financiare (carduri, conturi bancare)
- Nu colectăm CNP sau alte documente de identitate
- Nu folosim cookies de profilare publicitară

## 3. De ce folosim datele

| Scop | Bază legală |
|---|---|
| Crearea și gestionarea contului | Contract |
| Publicarea conținutului tău | Contract |
| Trimiterea de notificări tranzacționale | Contract |
| Combaterea abuzurilor și fraudei | Interes legitim |
| Îmbunătățirea platformei | Interes legitim |
| Respectarea obligațiilor legale | Obligație legală |

Nu vom folosi datele tale în scopuri de marketing fără consimțământul tău explicit.

## 4. Cu cine partajăm datele

Nu vindem datele tale. Le partajăm doar cu:

- **Furnizori tehnici** care procesează date strict în numele nostru:
  - **Hetzner** (Germania) — hosting servere
  - **Brevo** (Franța) — email transactional
- **Autorități publice**, doar dacă suntem obligați prin lege
- **Alți utilizatori**, în limita conținutului public pe care îl publici (anunțuri, postări forum)

## 5. Cât timp păstrăm datele

| Tip de date | Perioadă |
|---|---|
| Cont activ | Atât timp cât folosești platforma |
| Cont șters | Datele de bază: 30 de zile (recuperare) → apoi anonimizare |
| Mesaje contact | 3 ani |
| Audit log moderare | 2 ani |
| Cookies | Vezi [Politica de Cookies](/cookies) |

## 6. Drepturile tale (GDPR)

Ai următoarele drepturi:

- **Acces** — să afli ce date avem despre tine
- **Rectificare** — să corectezi date incorecte
- **Ștergere** („dreptul de a fi uitat") — să ștergi contul și datele asociate
- **Restricționare** — să limitezi prelucrarea în anumite cazuri
- **Portabilitate** — să primești datele tale într-un format structurat (JSON)
- **Opoziție** — să te opui prelucrării pe bază de interes legitim
- **Retragerea consimțământului** — oricând, fără a afecta legalitatea prelucrării anterioare

Pentru a-ți exercita aceste drepturi, scrie la contact@sintezaur.ro. Vom răspunde în maxim 30 de zile.

Ai dreptul să depui o plângere la **Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)** — www.dataprotection.ro.

## 7. Securitate

Aplicăm măsuri tehnice și organizatorice rezonabile pentru a-ți proteja datele:

- Parolele sunt stocate criptat (hash bcrypt)
- Conexiunile sunt securizate HTTPS
- Accesul la baza de date este restricționat
- Backup-uri regulate

Totuși, niciun sistem nu este 100% sigur. Dacă apare o breșă de securitate care îți poate afecta drepturile, vei fi notificat în maxim 72 de ore.

## 8. Transferuri internaționale

Datele sunt stocate pe servere din Uniunea Europeană (Germania, Hetzner). Nu transferăm date în afara SEE.

## 9. Minori

Sintezaur este destinat utilizatorilor de **16 ani și peste**. Dacă suspectăm că un utilizator este minor sub 16 ani, contul va fi suspendat.

## 10. Modificări

Această politică poate fi actualizată. Modificările majore vor fi notificate prin email.

## 11. Contact

Pentru orice întrebare legată de confidențialitate: contact@sintezaur.ro.
$md$),

  ('cookies',
   'Politica de Cookies',
   'Ce cookies folosim, de ce, și cum le poți controla.',
   $md$# Politica de Cookies

## Ce sunt cookies-urile?

Cookies-urile sunt fișiere mici de text salvate de browser pe dispozitivul tău când vizitezi un site. Ne ajută să ținem minte preferințele tale și să facem funcționalitatea de bază să funcționeze.

## Ce cookies folosim

### Cookies strict necesare

Acestea sunt indispensabile pentru funcționarea site-ului. **Nu necesită consimțământ.**

| Nume | Scop | Durată |
|---|---|---|
| `auth_session` | Te menține autentificat | 7 zile |
| `auth_refresh` | Reînnoiește sesiunea automat | 30 zile |
| `csrf_token` | Protecție împotriva atacurilor CSRF | Sesiune |
| `theme` | Reține alegerea de temă (clar/întunecat) | 1 an |
| `locale` | Reține limba aleasă | 1 an |

### Ce **NU** folosim

- Nu folosim cookies de profilare publicitară
- Nu folosim cookies de la rețele de marketing terțe (Google Ads, Meta etc.)
- Nu vindem date despre comportamentul tău

### Cookies analitice (viitor)

În viitor, intenționăm să folosim un instrument de analytics respectuos cu confidențialitatea (ex. Umami, self-hosted), care nu stochează date personale. Vei fi anunțat în avans prin actualizarea acestei pagini.

## Cum gestionezi cookies-urile

Poți șterge sau bloca cookies-urile din setările browser-ului. Atenție: blocarea cookies-urilor strict necesare va împiedica autentificarea pe Sintezaur.

Tutoriale per browser:

- [Chrome](https://support.google.com/chrome/answer/95647)
- [Firefox](https://support.mozilla.org/ro/kb/cookie-uri-informatii-care-sunt-stocate)
- [Safari](https://support.apple.com/ro-ro/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/ro-ro/microsoft-edge/cookies)

## Contact

Întrebări? contact@sintezaur.ro.
$md$),

  ('regulament-forum',
   'Regulamentul Forumului',
   'Regulile de conduită și moderare pe forumul Sintezaur.',
   $md$# Regulamentul Forumului

Forumul Sintezaur este un loc pentru producători de muzică din România. Scopul nostru: discuții utile, respect între participanți, conținut care merită citit peste un an.

## Reguli generale

### Da

- **Respect.** Critică ideile, nu oamenii.
- **Conținut tehnic / muzical.** Întrebări, recomandări, prezentări de proiecte, demo-uri.
- **Limba română**, cu împrumuturi tehnice acceptate (LFO, sidechain, oscilator etc.).
- **Citate scurte** când răspunzi cuiva — taie ce nu e relevant.
- **Caută înainte să întrebi.** Multe răspunsuri există deja.

### Nu

- **Atacuri personale, insulte, hărțuire.** Inclusiv ironii repetate la adresa altor utilizatori.
- **Discriminare** pe orice criteriu.
- **Spam, publicitate neautorizată, scheme piramidale.** Promovarea propriilor proiecte muzicale este OK într-un thread dedicat, dar nu spammezi același link în 20 de thread-uri.
- **Pirat / crack-uri.** Discuții despre soft fără licență, link-uri către download-uri ilegale, întrebări „de unde descarc X" — nu se acceptă.
- **Off-topic prelungit.** O glumă e OK, dar nu transforma un thread tehnic într-o discuție politică.
- **Postări duplicate** sau readucerea în prim-plan a thread-urilor vechi fără adăugare de valoare.

## Postări noi

- **Titlu descriptiv.** „Probleme cu Korg Minilogue XD — buton arpegiator" e mai bun decât „ajutor".
- **Categorie potrivită.** Verifică ghidul de categorii înainte să postezi.
- **Format curat.** Folosește paragrafe, nu zid de text.

## Anunțuri de vânzare

**Forumul nu este pentru anunțuri de vânzare.** Pentru asta există [Bazarul](/bazar). Postări care propun vânzări vor fi mutate sau șterse.

## Cum funcționează moderarea

- **Prima ta postare** trece printr-o coadă de aprobare scurtă (anti-spam).
- **Like-urile** („Util") nu influențează clasamentul, doar oferă feedback autorului.
- **Raportările** ajung la moderatori într-o coadă publică. Folosește butonul „Raportează" pentru încălcări — nu răspunde în thread cu „ascundeți postarea asta!".
- **Insigne** (badges) se acordă automat pentru participare consistentă. Nu poți cumpăra sau negocia insigne.

## Acțiuni de moderare

În ordine de severitate:

1. **Editare** — corectare format, titlu sau adăugare lipsă context
2. **Ascundere** — postarea rămâne dar nu e vizibilă; autorul primește notificare cu motiv
3. **Blocare thread** — nu mai sunt acceptate răspunsuri
4. **Ștergere** — postarea dispare definitiv (cazuri grave: spam, conținut ilegal)
5. **Suspendare cont** — temporar (7 zile / 30 zile) sau permanent

**Apel:** dacă o decizie de moderare ți se pare greșită, trimite un mesaj prin [Contact](/contact) cu link-ul postării. Răspundem în 7 zile.

## Conținut pirat și NSFW

- Linkurile către soft pirat = ștergere instant + avertisment.
- Conținutul explicit sexual sau violent = nu este permis.

## Confidențialitatea altora

- Nu publica date personale ale altor utilizatori fără acordul lor (adresă, număr telefon, conversații private).
- Pentru capturi de conversații private din chat, ascunde numele celuilalt utilizator.

## Întrebări?

contact@sintezaur.ro sau formularul [Contact](/contact).
$md$),

  ('despre',
   'Despre Sintezaur',
   'Cine suntem, de ce am construit Sintezaur și pentru cine.',
   $md$# Despre Sintezaur

## Ce este Sintezaur

Sintezaur este o platformă online dedicată producătorilor de muzică din România. Reunește patru lucruri într-un singur loc:

- **Tezaur** — enciclopedie de echipamente muzicale (sintetizatoare, drum machines, module Eurorack, software etc.) cu specificații, fotografii, recenzii și prețuri de piață
- **Bazar** — piață peer-to-peer pentru cumpărarea, vânzarea și schimbul de echipamente muzicale
- **Revista** — articole, recenzii, tutoriale și interviuri despre tehnologie muzicală
- **Forum** — discuții comunitare grupate pe categorii (gear, producție, live, business etc.)

## De ce există

În România, comunitatea producătorilor de muzică e răspândită pe Facebook (în grupuri private, greu de căutat), pe Discord (cu conversații care se evaporă) și pe câteva forumuri internaționale care nu acoperă specificul local (curieri români, prețuri în lei, vocabular românesc).

Sintezaur strânge totul într-un singur loc, în limba română, cu căutare bună și permanență — adică ce ai scris acum 3 ani să fie încă găsibil și relevant.

## Pentru cine

- **Producători de muzică electronică** — de la începători până la profesioniști
- **Colecționari de echipamente** vintage și noi
- **Pasionați de sintetizatoare** — hardware, software, modular
- **Magazine și luthieri** — vor avea conturi B2B în viitor

## Cine este în spate

Sintezaur este construit și operat de **Iulian Cazan**, persoană fizică, ca proiect personal. Sunt producător de muzică și dezvoltator de software.

Platforma e **gratuită pentru utilizatori**. Pe viitor poate apărea o opțiune premium pentru funcționalități avansate, dar funcțiile esențiale (cont, anunțuri, mesaje, postări forum) rămân gratuite.

## Tehnologie

- Hostat pe servere din Uniunea Europeană (Hetzner, Germania)
- Construit cu Angular + NestJS + Postgres
- Imagini optimizate, încărcare rapidă, fără tracker-e de marketing

## Roadmap

Lucrurile la care lucrăm:

- Lansare publică completă (în curs)
- Funcționalitate de comparație side-by-side a echipamentelor
- Aplicație mobilă
- Versiune în limba engleză pentru utilizatori din afara României

## Contact

Vrei să contribui, ai idei, ai găsit un bug? Scrie pe contact@sintezaur.ro sau folosește formularul [Contact](/contact).

Platforma este în versiune beta — feedback-ul tău contează enorm în această fază.
$md$),

  ('contact',
   'Contact',
   'Trimite-ne un mesaj — întrebări, sugestii, raportări, colaborări.',
   $md$# Contact

Întrebări, sugestii, raportări sau colaborări — folosește formularul de mai jos sau scrie direct la **contact@sintezaur.ro**.

## Ce primim cel mai des

- **Cumpărători / vânzători** — întrebări despre Bazar, raportări de anunțuri suspecte, probleme cu tranzacții
- **Editori** — propuneri de articole pentru Revista, colaborări editoriale
- **Juridic** — solicitări GDPR, sesizări legale, drepturi de autor
- **Altele** — bug-uri, idei, feedback general

Vom răspunde în maxim **3 zile lucrătoare**.

Pentru raportări urgente de moderare (spam, abuz, conținut ilegal), folosește butonul „Raportează" direct pe postarea / anunțul / utilizatorul în cauză — răspundem mai rapid.
$md$)

ON CONFLICT (slug) DO NOTHING;
