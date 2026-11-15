# Site B.CREA

Site vitrine de B.CREA, personnalisation d'objets à Manduel (Gard).
Site créé à l'aide de Claude par Clémence Despierre.

---

## 1. Mettre le site en ligne avec GitHub Pages

1. Créez un compte gratuit sur **https://github.com** (ou connectez-vous).
2. En haut à droite, cliquez sur **+** puis **New repository**.
   - **Repository name** : `bcrea` (ou le nom de votre choix).
   - Laissez **Public** coché : c'est nécessaire pour GitHub Pages gratuit. Ce dossier ne contient que des informations publiques, aucune donnée client.
   - Cliquez sur **Create repository**.
3. Sur la page qui s'ouvre, cliquez sur le lien **uploading an existing file**.
4. Décompressez le fichier `bcrea-site-github.zip` sur votre ordinateur, ouvrez le dossier `bcrea-github`, sélectionnez **tout son contenu** (fichiers et dossiers : `index.html`, `css`, `js`, `images`, `content`, `.nojekyll`, `README.md`) et glissez-le dans la page GitHub.
   - Sur Mac, le fichier `.nojekyll` est caché : appuyez sur **Cmd + Maj + .** pour l'afficher. S'il manque, ce n'est pas grave.
5. En bas, cliquez sur **Commit changes**.
6. Allez dans **Settings** (onglet du dépôt) → **Pages** (menu de gauche).
   - **Source** : *Deploy from a branch*.
   - **Branch** : `main`, dossier `/ (root)`, puis **Save**.
7. Patientez une à deux minutes, puis actualisez la page : l'adresse du site s'affiche, du type
   `https://VOTRE-NOM.github.io/bcrea/`.

---

## 2. Activer le formulaire de devis (obligatoire)

Les demandes de devis et les demandes professionnelles sont envoyées **par email à b.crea30@gmail.com** grâce au service gratuit **Web3Forms**. Le site lui-même ne garde aucune donnée.

1. Allez sur **https://web3forms.com**.
2. Saisissez **b.crea30@gmail.com** et validez.
3. B.CREA reçoit un email contenant une **Access Key**.
4. Sur GitHub, ouvrez le fichier `js/config.js`, cliquez sur le **crayon** (Edit).
5. Remplacez `COLLER-ICI-LA-CLE-WEB3FORMS` par la clé, en gardant les guillemets.
6. Cliquez sur **Commit changes**.

Tant que la clé n'est pas collée, le formulaire propose au client de copier son message pour l'envoyer par Messenger.

À savoir :
- Chaque demande arrive par email, avec toutes les informations saisies. En répondant à cet email, on répond directement au client.
- Selon l'offre Web3Forms, l'envoi de pièces jointes et l'email de confirmation automatique au client peuvent être payants. Le site indique donc aux clients d'envoyer leurs photos en réponse à l'email de B.CREA, et affiche le message de confirmation à l'écran.

---

## 3. Modifier le contenu (sans toucher au code)

Tout ce qui change souvent se trouve dans le dossier **`content/`**. Pour modifier un fichier : ouvrez-le sur GitHub, cliquez sur le **crayon**, modifiez, puis **Commit changes**. Le site se met à jour en une à deux minutes.

**Attention aux guillemets et aux virgules** : chaque texte est entre guillemets `"…"`, et les éléments d'une liste sont séparés par des virgules (pas de virgule après le dernier).

| Fichier | Contenu |
|---|---|
| `content/site.json` | L'annonce en haut du site (`"annonce"`), l'email et le téléphone affichés |
| `content/actus.json` | La page **À la une** : articles et événements |
| `content/boutique.json` | Les articles de la **Boutique**, avec prix et stock |
| `content/tarifs.json` | La liste des créations et leurs prix (page Créations et choix du formulaire) |
| `content/galerie.json` | Les photos des **Réalisations** |
| `content/avis.json` | Les **avis clients** à afficher |

### Ajouter une photo
1. Ouvrez le dossier `images/galerie` (ou `images/boutique`, `images/actus`).
2. **Add file** → **Upload files**, glissez la photo, **Commit changes**.
   Astuce : nommez les photos sans espaces ni accents, par exemple `mug-rose.jpg`.
3. Indiquez son chemin dans le fichier JSON concerné, par exemple `"images/boutique/mug-rose.jpg"`.

### Exemples

**Un événement** dans `content/actus.json` (`"type"` vaut `"evenement"` ou `"article"`) :
```json
[
  {
    "type": "evenement",
    "titre": "Marché de Noël du Mas de Laune",
    "date": "2026-12-13",
    "lieu": "Mas de Laune, Manduel",
    "texte": "Retrouvez B.CREA et ses créations au marché de Noël.",
    "photo": ""
  }
]
```
La date s'écrit `AAAA-MM-JJ`. Les événements passés disparaissent tout seuls du site.

**Un article de la boutique** dans `content/boutique.json` :
```json
[
  {
    "nom": "Porte-clés cœur",
    "prix": "8 €",
    "stock": 5,
    "description": "Porte-clés en métal, prêt à offrir.",
    "photos": ["images/boutique/porte-cles-coeur.jpg"]
  }
]
```
Mettez `"stock": 0` pour afficher **Rupture de stock**. Laissez `"prix": ""` pour afficher **Sur devis**.

**Une photo de réalisation** dans `content/galerie.json` (`"categorie"` vaut `mariage`, `fetes`, `objets`, `coffrets` ou `octobre`) :
```json
{ "image": "images/galerie/mug-rose.jpg", "titre": "Mug « Super mamie »", "categorie": "objets" }
```

**Un tarif** dans `content/tarifs.json` (`"rubrique"` vaut `objets` ou `fetes`) :
```json
{ "nom": "Mugs", "rubrique": "objets", "prix": "dès 12 €" }
```

**Un avis** dans `content/avis.json` (uniquement de vrais avis reçus) :
```json
[
  { "prenom": "Julie", "note": 5, "date": "novembre 2026", "texte": "Super travail !", "reponse": "Merci Julie !" }
]
```

### Modifier les autres textes
Les textes des pages (présentation, infos pratiques, FAQ, mentions légales, CGV…) sont dans `index.html`. Ouvrez-le avec le crayon, utilisez **Ctrl + F** (ou **Cmd + F**) pour retrouver la phrase, modifiez-la, puis **Commit changes**.

---

## 4. À ne pas oublier

- **Ne mettez jamais de données clients** (noms, adresses, commandes) dans ce dossier : il est public. Les commandes se gèrent dans *Gestion boutique*.
- **Photos avec des prénoms** (plaque « Jules & Anne », panneau « Fanny & Benjamin », marque-places, cadre Scrabble) : vérifiez l'accord des clients, sinon retirez-les de `content/galerie.json`.
- **Médiateur de la consommation** : une fois l'adhésion faite, ajoutez son nom dans les CGV (`index.html`, section « Litiges et médiation »).
- **Nom de domaine** (par exemple `bcrea.fr`) : il peut être acheté chez un registraire, puis indiqué dans **Settings → Pages → Custom domain**.
