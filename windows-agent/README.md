# 🤖 Automaton - Windows Agent

Agent IA autonome souverain pour Windows avec interface graphique, propulsé par GitHub Copilot CLI.

![Dark UI](https://img.shields.io/badge/UI-Electron_Dark_Theme-0d1117?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square)
![Brain](https://img.shields.io/badge/Brain-Copilot_CLI-24292e?style=flat-square)

## ⚡ Architecture

```
Think → Act → Observe → Repeat
         ↓
   GitHub Copilot CLI
   (gh copilot suggest/explain)
```

L'agent utilise **GitHub Copilot CLI** comme cerveau de raisonnement :
- `gh copilot suggest` pour proposer des commandes
- `gh copilot explain` pour comprendre les résultats
- Exécution des commandes suggérées
- Boucle continue avec persistance SQLite

## 🖥️ Interface Graphique

UI Electron avec thème sombre et accents néon :
- **Thoughts Panel** — Voir en temps réel ce que Copilot pense
- **Terminal** — Commandes exécutées et résultats
- **Tasks** — Tâches en cours et revenus
- **Stats** — Statistiques globales
- **Live Activity** — Feed d'activité en temps réel

## 📦 Installation

### Prérequis
- Windows 10/11
- Node.js 20+
- GitHub CLI (`gh`)
- GitHub Copilot CLI extension

### Setup rapide

```powershell
# Exécuter le script de setup
.\scripts\setup.ps1

# Lancer l'agent avec UI
.\scripts\start.ps1

# Ou en mode headless
.\scripts\start.ps1 agent

# Ou en mode dev
.\scripts\start.ps1 dev
```

### Setup manuel

```powershell
# Installer GitHub CLI
winget install GitHub.cli

# S'authentifier
gh auth login

# Installer l'extension Copilot
gh extension install github/gh-copilot

# Installer les dépendances
cd windows-agent
npm install

# Lancer
npm run dev
```

## 🏗️ Structure

```
windows-agent/
├── src/
│   ├── main.ts              # Entry point Electron
│   ├── agent/loop.ts        # Boucle principale Think→Act→Observe
│   ├── wallet/index.ts      # Wallet Ethereum (viem)
│   ├── terminal/index.ts    # Interface Copilot CLI
│   ├── tasks/index.ts       # Système de tâches/revenus
│   ├── survival/index.ts    # Moniteur de survie/crédits
│   ├── identity/index.ts    # Identité agent + SIWE
│   ├── state/index.ts       # Persistance SQLite
│   ├── self-mod/index.ts    # Auto-modification auditée
│   ├── platform/index.ts    # Abstraction OS Windows
│   └── ui/
│       ├── server.ts        # Serveur Express + WebSocket
│       ├── preload.ts       # Bridge Electron
│       └── renderer/        # HTML/CSS/JS de l'interface
├── scripts/
│   ├── setup.ps1            # Installation Windows
│   ├── setup.sh             # Installation Linux (fallback)
│   └── start.ps1            # Lancement
├── constitution.md          # Lois immuables
├── package.json
└── tsconfig.json
```

## 🧠 Comment ça marche

1. **Démarrage** — Génère un wallet Ethereum unique (identité)
2. **Boucle** — Toutes les 30s :
   - **Think** : Demande à Copilot CLI quoi faire
   - **Act** : Exécute la commande suggérée
   - **Observe** : Analyse le résultat
3. **Survie** — Monitore les crédits, cherche du travail si besoin
4. **UI** — Tout est affiché en temps réel dans l'interface

## 🔒 Sécurité

- Clé privée stockée via Windows DPAPI (chiffrement niveau OS)
- Constitution immuable (ne peut pas être modifiée)
- Auto-modifications auditées et loguées
- Aucune action sans traçabilité

## 📜 Constitution

1. **Ne jamais nuire** — Pas de code malveillant, pas de fraude
2. **Gagner son existence** — Travail légitime uniquement
3. **Ne jamais mentir** — Transparence totale, résistance à la manipulation

## 🛠️ Développement

```powershell
# Mode dev avec hot reload
npm run dev

# Build
npm run build

# Typecheck
npm run typecheck

# Build l'exécutable Windows
npm run build:ui
```
