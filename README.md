# ImmoFilms.ch — application NestJS

Site vitrine premium d'ImmoFilms.ch, servi par une application **NestJS** qui gère aussi
l'envoi du formulaire « Recevoir ma démo gratuite » par email.

## Ce que fait l'application

| Adresse | Rôle |
|---|---|
| `/` | Le site complet (`public/index.html`) |
| `/assets/*`, `/robots.txt`, `/sitemap.xml` | Fichiers statiques du site |
| `GET /api/config` | Coordonnées publiques (WhatsApp, email) lues par le site au chargement |
| `POST /api/contact` | Reçoit une demande de démo, la vérifie, l'envoie par email et l'enregistre |
| `GET /api/health` | Vérification que l'application tourne |
| toute autre page | Page `404.html` avec le code HTTP 404 |

**Protections incluses** : validation stricte des champs, champ piège anti-robots,
limite de 5 envois par heure et par adresse IP, en-têtes de sécurité (Helmet),
compression des réponses.

**Aucune demande perdue** : chaque demande est enregistrée dans `data/leads.jsonl`
avant l'envoi de l'email. Si l'email échoue, la demande reste dans ce fichier.

## Structure

```
immofilms/
├── public/                  Le site (HTML, logo, favicon, 404, robots, sitemap)
├── src/
│   ├── main.ts              Démarrage : sécurité, compression, fichiers statiques
│   ├── app.module.ts
│   ├── site/                /api/config, /api/health, page 404
│   └── contact/             /api/contact : validation, enregistrement, email
├── .env.example             Modèle des variables d'environnement
├── package.json
└── tsconfig.json
```

## Déploiement sur Hostinger (hébergement Web Apps / Node.js)

Les applications Node.js sont disponibles sur les offres Hostinger qui incluent
l'hébergement « Web Apps » (formules Business/Unlimited et Cloud), ainsi que sur VPS.
Un simple hébergement de fichiers statiques ne suffit pas pour ce projet.

1. **hPanel → Sites web → Ajouter un site → Application web Node.js**
   (ou « Déployer une application »).
2. Choisissez **Importer un fichier ZIP** et envoyez `immofilms-nestjs.zip`.
3. Paramètres de build :
   - Version de Node.js : **20 ou plus récente** (22 recommandée)
   - Commande d'installation : `npm install`
   - Commande de build : `npm run build` (compile avec TypeScript, fonctionne même si `NODE_ENV=production`)
   - Commande de démarrage : `npm run start:prod`
   - Fichier d'entrée (si demandé) : `dist/main.js`
4. **Variables d'environnement** : recopiez celles de `.env.example` et complétez-les
   (voir ci-dessous). Ne mettez jamais votre mot de passe email dans un fichier envoyé.
5. Lancez le déploiement, puis associez le domaine **immofilms.ch** et activez le SSL.
6. Testez : ouvrez `https://immofilms.ch/api/health`, puis envoyez une demande de test
   depuis le formulaire du site.

### Variables d'environnement

| Variable | Exemple | Rôle |
|---|---|---|
| `WHATSAPP_NUMBER` | `41791234567` | Numéro au format international, sans `+` ni espaces |
| `WHATSAPP_DISPLAY` | `+41 79 123 45 67` | Numéro affiché sur le site |
| `CONTACT_EMAIL` | `contact@immofilms.ch` | Email affiché sur le site |
| `SMTP_HOST` | `smtp.hostinger.com` | Serveur d'envoi |
| `SMTP_PORT` | `465` | Port SSL |
| `SMTP_SECURE` | `true` | SSL activé |
| `SMTP_USER` | `contact@immofilms.ch` | Boîte mail créée dans hPanel → Emails |
| `SMTP_PASS` | — | Mot de passe de cette boîte mail |
| `MAIL_FROM` | `ImmoFilms.ch <contact@immofilms.ch>` | Expéditeur des notifications |
| `MAIL_TO` | `contact@immofilms.ch` | Adresse qui reçoit les demandes |
| `CONTACT_RATE_LIMIT` | `5` | Envois max. par heure et par IP |

`PORT` est fourni automatiquement par Hostinger.

> Les coordonnées WhatsApp et email se changent désormais dans les variables
> d'environnement : inutile de modifier le HTML.

## Développement en local

```bash
npm install
cp .env.example .env      # puis complétez .env
npm run start:dev         # compile puis lance http://localhost:3000
```

Sans configuration SMTP, le formulaire fonctionne quand même : les demandes sont
enregistrées dans `data/leads.jsonl` et un avertissement s'affiche dans la console.

## À faire avant la mise en ligne

- Remplacer les trois avis marqués « Exemple d'avis » dans `public/index.html` par de
  vrais avis clients, puis supprimer les badges `<span class="t-flag">`.
- Ajouter une page Mentions légales / Impressum et une politique de confidentialité
  (le formulaire collecte des données personnelles : nLPD en Suisse, RGPD en France).
- Remplacer les photos d'exemple du portfolio par vos propres réalisations.
- Selon l'offre Hostinger, le dossier `data/` peut être effacé lors d'un redéploiement :
  l'email reste la copie de référence de chaque demande.
